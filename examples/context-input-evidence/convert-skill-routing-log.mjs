#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-skill-routing-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'skill-routing-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'skill-routing-otel-trace.json');

function sha256(value) {
  return `sha256:${createHash('sha256').update(value ?? '').digest('hex')}`;
}

function hashRef(value) {
  return sha256(value ?? '').slice(0, 19);
}

function readJsonl(path) {
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${path}:${index + 1}: ${error.message}`);
      }
    });
}

function unixNano(isoTimestamp) {
  return `${BigInt(Date.parse(isoTimestamp)) * 1_000_000n}`;
}

function otelValue(value) {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number' && Number.isInteger(value)) return { intValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (value == null) return { stringValue: '' };
  return { stringValue: String(value) };
}

function attributesToOtel(attributes) {
  return Object.entries(attributes).map(([key, value]) => ({ key, value: otelValue(value) }));
}

function tokenBucket(value) {
  if (value < 1_000) return 'under_1k';
  if (value < 10_000) return 'under_10k';
  if (value < 50_000) return 'under_50k';
  return 'over_50k';
}

function scoreBucket(value) {
  if (value >= 0.9) return 'gte_0_90';
  if (value >= 0.75) return 'gte_0_75';
  if (value >= 0.5) return 'gte_0_50';
  return 'lt_0_50';
}

function rateBucket(value) {
  if (value >= 0.95) return 'gte_0_95';
  if (value >= 0.75) return 'gte_0_75';
  if (value >= 0.5) return 'gte_0_50';
  return 'lt_0_50';
}

const records = readJsonl(inputPath);
const benchmark = records.find((record) => record.type === 'benchmark.start');
const index = records.find((record) => record.type === 'skill.router.index.loaded');
const cases = records.filter((record) => record.type === 'skill.router.case.evaluated');
const bodyLoads = records.filter((record) => record.type === 'skill.body.loaded');
const completed = records.find((record) => record.type === 'skill.router.benchmark.completed');

if (!benchmark || !index || cases.length === 0 || !completed) {
  throw new Error(`Expected benchmark.start, skill.router.index.loaded, skill.router.case.evaluated, and skill.router.benchmark.completed records in ${inputPath}`);
}

const traceSeed = `${benchmark.session_id}:${benchmark.benchmark_id}:skill-routing`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const indexEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'skill.router.index.loaded',
  time: index.time,
  attributes: {
    'session.id': benchmark.session_id,
    'gen_ai.conversation.id': benchmark.conversation_id,
    'agent.name': benchmark.agent,
    'skill.catalog.id_hash': hashRef(index.catalog_id),
    'skill.catalog.skill_count': index.skill_names.length,
    'skill.catalog.names_hash': sha256(index.skill_names.join('\n')),
    'skill.router.startup_strategy': index.startup_strategy,
    'skill.router.description_token_count_bucket': tokenBucket(index.description_token_count),
    'skill.router.full_body_token_count_bucket': tokenBucket(index.full_body_token_count),
    'skill.router.full_bodies_loaded_at_startup': false,
    'privacy.raw_skill_descriptions_recorded': false,
    'privacy.raw_skill_bodies_recorded': false
  }
};

const caseEvents = cases.map((record) => ({
  trace_id: traceId,
  span_id: spanId,
  name: 'skill.router.case.evaluated',
  time: record.time,
  attributes: {
    'session.id': benchmark.session_id,
    'gen_ai.conversation.id': benchmark.conversation_id,
    'skill.router.benchmark.id_hash': hashRef(benchmark.benchmark_id),
    'skill.router.case.id_hash': hashRef(record.case_id),
    'skill.router.prompt_hash': sha256(record.raw_prompt),
    'skill.router.expected_skill_hash': hashRef(record.expected_skill),
    'skill.router.selected_skill_hash': hashRef(record.selected_skill),
    'skill.router.top_k_hash': sha256(record.top_k.join('\n')),
    'skill.router.match': record.match,
    'skill.router.confidence_bucket': scoreBucket(record.confidence),
    'skill.router.reason_hash': sha256(record.reason),
    'privacy.raw_prompt_recorded': false,
    'privacy.raw_selection_reason_recorded': false
  }
}));

const bodyLoadEvents = bodyLoads.map((record) => ({
  trace_id: traceId,
  span_id: spanId,
  name: 'skill.body.loaded',
  time: record.time,
  attributes: {
    'session.id': benchmark.session_id,
    'gen_ai.conversation.id': benchmark.conversation_id,
    'skill.router.case.id_hash': hashRef(record.case_id),
    'skill.name_hash': hashRef(record.skill),
    'skill.body.hash': sha256(record.raw_skill_body),
    'skill.body.load_reason': record.load_reason,
    'skill.body.loaded_after_route': true,
    'privacy.raw_skill_body_recorded': false
  }
}));

const completedEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'skill.router.benchmark.completed',
  time: completed.time,
  attributes: {
    'session.id': benchmark.session_id,
    'gen_ai.conversation.id': benchmark.conversation_id,
    'skill.router.benchmark.id_hash': hashRef(benchmark.benchmark_id),
    'skill.router.golden_set_hash': hashRef(benchmark.golden_set),
    'skill.router.records_total': completed.records_total,
    'skill.router.usable_records': completed.usable_records,
    'skill.router.format_failures': completed.format_failures,
    'skill.router.top1_rate_bucket': rateBucket(completed.top1_rate),
    'skill.router.top2_rate_bucket': rateBucket(completed.top2_rate),
    'skill.router.model_results_hash': sha256(JSON.stringify(completed.model_results)),
    'skill.router.next_action_hash': sha256(completed.next_action),
    'skill.router.audit_gap': 'receipt_proves_routing_boundary_not_task_effectiveness',
    'privacy.raw_benchmark_prompts_recorded': false,
    'privacy.raw_skill_text_recorded': false
  }
};

const events = [indexEvent, ...caseEvents, ...bodyLoadEvents, completedEvent]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-skill-routing-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.skill_routing_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.skill.routing_benchmark',
              kind: 1,
              startTimeUnixNano: unixNano(benchmark.time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': benchmark.session_id,
                'gen_ai.conversation.id': benchmark.conversation_id,
                'agent.name': benchmark.agent,
                'workspace.name': benchmark.workspace,
                'gen_ai.request.model': benchmark.model,
                'skill.router.version_hash': hashRef(benchmark.router_version),
                'skill.router.case_count': cases.length
              }),
              events: events.map((event) => ({
                name: event.name,
                timeUnixNano: unixNano(event.time),
                attributes: attributesToOtel(event.attributes)
              }))
            }
          ]
        }
      ]
    }
  ]
};

writeFileSync(tracePath, `${JSON.stringify(trace, null, 2)}\n`);

const forbiddenRawStrings = [
  'private activation prompts',
  'internal corpus notes',
  'unpublished skill body drafts',
  'private draft description',
  'private task: agent is losing the goal',
  'private task: keep tool outputs out of prompt',
  'private task: reconcile persistent agent memories',
  'private SKILL.md body draft',
  'operator notes',
  'internal evaluation hints',
  'split compression vs memory-consolidation activation examples'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));

const summary = {
  schema: 'pluribus.skillRoutingReceipt.demo.v0',
  eventCount: events.length,
  evaluatedCases: cases.length,
  loadedSkillBodies: bodyLoads.length,
  indexOnlyAtStartup: indexEvent.attributes['skill.router.full_bodies_loaded_at_startup'] === false,
  top1RateBucket: completedEvent.attributes['skill.router.top1_rate_bucket'],
  includesAuditGap: completedEvent.attributes['skill.router.audit_gap'],
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/skill-routing-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/skill-routing-otel-trace.json',
  lesson: 'Skill routing benchmarks need privacy-safe receipts: prove which description index loaded, which skill was selected for each activation case, which body expanded after routing, and where routing accuracy stops short of task effectiveness.'
};

console.log(JSON.stringify(summary, null, 2));
