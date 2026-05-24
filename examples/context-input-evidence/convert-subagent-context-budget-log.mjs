#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-subagent-context-budget-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'subagent-context-budget-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'subagent-context-budget-otel-trace.json');

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
  if (value < 100_000) return 'under_100k';
  return 'over_100k';
}

function countBucket(value) {
  if (value === 0) return 'zero';
  if (value <= 5) return 'under_5';
  if (value <= 25) return 'under_25';
  if (value <= 100) return 'under_100';
  if (value <= 500) return 'under_500';
  return 'over_500';
}

function ratioBucket(numerator, denominator) {
  const ratio = denominator > 0 ? numerator / denominator : 0;
  if (ratio < 0.25) return 'under_25_percent';
  if (ratio < 0.5) return 'under_50_percent';
  if (ratio < 0.75) return 'under_75_percent';
  if (ratio < 0.9) return 'under_90_percent';
  return 'over_90_percent';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const budget = records.find((record) => record.type === 'subagent.boot.context_budget.evaluated');
const loaded = records.filter((record) => record.type === 'subagent.context_component.loaded');
const suppressed = records.filter((record) => record.type === 'subagent.context_component.suppressed');
const completed = records.find((record) => record.type === 'subagent.boot.completed');

if (!session || !budget || loaded.length === 0 || !completed) {
  throw new Error(`Expected session.start, subagent.boot.context_budget.evaluated, loaded components, and subagent.boot.completed records in ${inputPath}`);
}

const selectedComponentCount = loaded.reduce((total, record) => total + record.selected_count, 0);
const suppressedComponentCount = [...loaded, ...suppressed].reduce((total, record) => total + record.suppressed_count, 0);
const loadedTokenCount = loaded.reduce((total, record) => total + record.token_count, 0);

const traceSeed = `${session.session_id}:${session.conversation_id}:subagent-context-budget`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const events = [
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'subagent.boot.context_budget.evaluated',
    time: budget.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'agent.name': session.agent,
      'subagent.id_hash': hashRef(budget.subagent_id),
      'subagent.role_hash': hashRef(budget.subagent_role),
      'subagent.tools.policy': budget.tools_policy,
      'subagent.context.parent_token_bucket': tokenBucket(budget.parent_context_token_count),
      'subagent.context.startup_token_bucket': tokenBucket(budget.subagent_startup_context_token_count),
      'subagent.context.window_token_bucket': tokenBucket(budget.total_context_window_tokens),
      'subagent.context.startup_ratio_bucket': ratioBucket(budget.subagent_startup_context_token_count, budget.total_context_window_tokens),
      'subagent.mcp.server_count_bucket': countBucket(budget.mcp_server_count),
      'subagent.mcp.tool_schema_count_bucket': countBucket(budget.mcp_tool_schema_count),
      'subagent.skill.listing_count_bucket': countBucket(budget.skill_listing_count),
      'subagent.rule.count_bucket': countBucket(budget.project_rule_count),
      'subagent.memory.index_count_bucket': countBucket(budget.memory_index_count),
      'privacy.raw_skill_listing_recorded': false,
      'privacy.raw_mcp_schemas_recorded': false,
      'privacy.raw_project_rules_recorded': false,
      'privacy.raw_memory_index_recorded': false
    }
  },
  ...loaded.map((record) => ({
    trace_id: traceId,
    span_id: spanId,
    name: 'subagent.context_component.loaded',
    time: record.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'subagent.id_hash': hashRef(budget.subagent_id),
      'subagent.context.component': record.component,
      'subagent.context.component_reason_hash': hashRef(record.reason),
      'subagent.context.candidate_count_bucket': countBucket(record.candidate_count),
      'subagent.context.selected_count_bucket': countBucket(record.selected_count),
      'subagent.context.suppressed_count_bucket': countBucket(record.suppressed_count),
      'subagent.context.token_bucket': tokenBucket(record.token_count),
      'subagent.context.component_sample_hash': sha256(record.raw_component_sample),
      'privacy.raw_component_recorded': false
    }
  })),
  ...suppressed.map((record) => ({
    trace_id: traceId,
    span_id: spanId,
    name: 'subagent.context_component.suppressed',
    time: record.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'subagent.id_hash': hashRef(budget.subagent_id),
      'subagent.context.component': record.component,
      'subagent.context.component_reason_hash': hashRef(record.reason),
      'subagent.context.candidate_count_bucket': countBucket(record.candidate_count),
      'subagent.context.selected_count_bucket': countBucket(record.selected_count),
      'subagent.context.suppressed_count_bucket': countBucket(record.suppressed_count),
      'subagent.context.token_bucket': tokenBucket(record.token_count),
      'subagent.context.component_sample_hash': sha256(record.raw_component_sample),
      'privacy.raw_component_recorded': false
    }
  })),
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'subagent.boot.completed',
    time: completed.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'subagent.id_hash': hashRef(budget.subagent_id),
      'subagent.boot.status': completed.status,
      'subagent.context.startup_token_bucket': tokenBucket(completed.startup_context_token_count),
      'subagent.context.remaining_token_bucket': tokenBucket(completed.remaining_context_token_count),
      'subagent.context.selected_component_count_bucket': countBucket(selectedComponentCount),
      'subagent.context.suppressed_component_count_bucket': countBucket(suppressedComponentCount),
      'subagent.context.loaded_token_bucket': tokenBucket(loadedTokenCount),
      'subagent.boot.first_task_hash': sha256(completed.first_task),
      'subagent.boot.mitigation_hash': sha256(completed.mitigation),
      'subagent.boot.audit_gap': completed.audit_gap
    }
  }
];

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-subagent-context-budget-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.subagent_context_budget_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.subagent.boot.context_budget',
              kind: 1,
              startTimeUnixNano: unixNano(budget.time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'subagent.tools.policy': budget.tools_policy,
                'subagent.context.receipt.scope': 'startup_budget_before_first_task'
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
  'Acme-Co',
  'sk_live_private_fixture',
  'sk_live_gateway_fixture',
  'finance@acme.example',
  'private-enterprise-mcp',
  'support.ticket.search',
  'TICKET-private-001',
  'Stripe prod incident',
  '/private/work/acme',
  'PAY-1234',
  'private support ops'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));

const summary = {
  schema: 'pluribus.subagentContextBudgetReceipt.demo.v0',
  eventCount: events.length,
  loadedComponentEvents: loaded.length,
  suppressedComponentEvents: suppressed.length,
  startupContextRatioBucket: events[0].attributes['subagent.context.startup_ratio_bucket'],
  mcpToolSchemaCountBucket: events[0].attributes['subagent.mcp.tool_schema_count_bucket'],
  skillListingCountBucket: events[0].attributes['subagent.skill.listing_count_bucket'],
  selectedComponentCountBucket: events.at(-1).attributes['subagent.context.selected_component_count_bucket'],
  suppressedComponentCountBucket: events.at(-1).attributes['subagent.context.suppressed_component_count_bucket'],
  includesFirstTaskHash: Boolean(events.at(-1).attributes['subagent.boot.first_task_hash']),
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/subagent-context-budget-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/subagent-context-budget-otel-trace.json',
  lesson: 'Subagent context-budget receipts should prove which startup components were eagerly loaded, selected, or suppressed before the first task, without exporting raw tool schemas, skill listings, memory, rules, prompts, paths, or secrets.'
};

console.log(JSON.stringify(summary, null, 2));
