#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-compaction-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'compaction-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'compaction-otel-trace.json');

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

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const start = records.find((record) => record.type === 'context.compaction.start');
const items = records.filter((record) => record.type === 'context.item.evaluated');
const completed = records.find((record) => record.type === 'context.compaction.completed');

if (!session || !start || !completed || items.length === 0) {
  throw new Error(`Expected session.start, context.compaction.start, context.item.evaluated, and context.compaction.completed records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${start.time}:context-compaction`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);
const compactionId = hashRef(`${session.session_id}:${start.time}:${completed.time}`);

const startEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.compaction.started',
  time: start.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'agent.name': session.agent,
    'context.compaction.id_hash': compactionId,
    'context.compaction.reason': start.reason,
    'context.compaction.trigger': start.trigger,
    'context.compaction.token_count.before_bucket': tokenBucket(start.token_count_before),
    'context.compaction.token_threshold_bucket': tokenBucket(start.token_threshold),
    'context.compaction.window_bucket': start.window_bucket,
    'context.compaction.objective.before_hash': sha256(start.raw_recent_task),
    'privacy.raw_prompt_recorded': false,
    'privacy.raw_context_recorded': false,
    'privacy.raw_tool_output_recorded': false
  }
};

const itemEvents = items.map((item) => ({
  trace_id: traceId,
  span_id: spanId,
  name: 'context.compaction.item.evaluated',
  time: item.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'context.compaction.id_hash': compactionId,
    'context.item.id_hash': hashRef(item.item_id),
    'context.item.kind': item.kind,
    'context.item.source': item.source,
    'context.item.source.hash': sha256(item.source),
    'context.item.semantic_role': item.semantic_role,
    'context.item.action': item.action,
    'context.item.token_count_bucket': tokenBucket(item.token_count),
    'context.item.summary_token_count_bucket': item.summary_token_count ? tokenBucket(item.summary_token_count) : '',
    'context.item.drop_reason': item.drop_reason ?? '',
    'context.item.raw_text_hash': sha256(item.raw_text),
    'context.item.raw_text_recorded': false,
    'context.item.reconstructable_from_hash': item.action === 'dropped' || item.action === 'preserved_hash_only',
    'privacy.raw_context_recorded': false,
    'privacy.raw_tool_output_recorded': false
  }
}));

const completedEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.compaction.completed',
  time: completed.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'context.compaction.id_hash': compactionId,
    'context.compaction.token_count.after_bucket': tokenBucket(completed.token_count_after),
    'context.compaction.summary.hash': sha256(completed.summary_hash_basis),
    'context.compaction.objective.after_hash': sha256(completed.objective_hash_basis),
    'context.compaction.item.count': items.length,
    'context.compaction.items.dropped': completed.dropped_count,
    'context.compaction.items.summarized': completed.summarized_count,
    'context.compaction.items.preserved': completed.preserved_count,
    'context.compaction.audit_gap': 'cannot_prove_semantic_equivalence_without_eval',
    'privacy.raw_summary_recorded': false,
    'privacy.raw_prompt_recorded': false,
    'privacy.raw_context_recorded': false,
    'privacy.raw_tool_output_recorded': false
  }
};

const events = [startEvent, ...itemEvents, completedEvent]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-context-compaction-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.compaction_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.context.compaction',
              kind: 1,
              startTimeUnixNano: unixNano(start.time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'context.compaction.id_hash': compactionId,
                'context.compaction.reason': start.reason,
                'context.compaction.trigger': start.trigger
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
  'private customer checkout failures',
  'never log customer payment tokens',
  'vendor URLs, internal commands',
  'customer-like fixture data',
  'root cause previously suspected',
  'avoid symptom patch'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));
const actionCounts = Object.fromEntries(items.map((item) => [item.action, items.filter((candidate) => candidate.action === item.action).length]));

const summary = {
  schema: 'pluribus.contextCompactionReceipt.demo.v0',
  eventCount: events.length,
  itemEvents: itemEvents.length,
  actionCounts,
  includesObjectiveHashes: Boolean(startEvent.attributes['context.compaction.objective.before_hash'] && completedEvent.attributes['context.compaction.objective.after_hash']),
  includesAuditGap: completedEvent.attributes['context.compaction.audit_gap'],
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/compaction-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/compaction-otel-trace.json',
  lesson: 'Context compaction needs receipts for trigger, item-level preserve/summarize/drop decisions, objective continuity, and audit gaps; green tests alone do not prove the original task survived compaction.'
};

console.log(JSON.stringify(summary, null, 2));
