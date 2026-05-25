#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-pruning-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'pruning-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'pruning-otel-trace.json');

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

function bytesBucket(value) {
  if (value < 1024) return 'under_1kb';
  if (value < 1024 * 1024) return 'under_1mb';
  if (value < 10 * 1024 * 1024) return 'under_10mb';
  if (value < 50 * 1024 * 1024) return 'under_50mb';
  return 'over_50mb';
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
const start = records.find((record) => record.type === 'context.prune.start');
const strategies = records.filter((record) => record.type === 'context.prune.strategy.evaluated');
const completed = records.find((record) => record.type === 'context.prune.completed');

if (!session || !start || strategies.length === 0 || !completed) {
  throw new Error(`Expected session.start, context.prune.start, strategy evaluations, and context.prune.completed records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${start.run_id}:context-pruning`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);
const runIdHash = hashRef(start.run_id);

const startedEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.prune.started',
  time: start.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'agent.name': session.agent,
    'context.prune.run_id_hash': runIdHash,
    'context.prune.tool': start.tool,
    'context.prune.command_hash': sha256(start.command),
    'context.prune.prescription': start.prescription,
    'context.prune.mode': start.mode,
    'context.prune.trigger': start.trigger,
    'context.prune.context_window_bucket': tokenBucket(start.context_window_tokens),
    'context.prune.token_count.before_bucket': tokenBucket(start.token_count_before),
    'context.prune.byte_count.before_bucket': bytesBucket(start.byte_count_before),
    'context.prune.start_ratio_bucket': ratioBucket(start.token_count_before, start.context_window_tokens),
    'context.prune.backup_id_hash': hashRef(start.backup_id),
    'context.prune.backup.created': true,
    'context.prune.plan.hash': sha256(start.raw_plan_notes),
    'privacy.raw_session_recorded': false,
    'privacy.raw_plan_recorded': false,
    'privacy.raw_prompt_recorded': false,
    'privacy.raw_tool_output_recorded': false
  }
};

const strategyEvents = strategies.map((strategy) => ({
  trace_id: traceId,
  span_id: spanId,
  name: 'context.prune.strategy.evaluated',
  time: strategy.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'context.prune.run_id_hash': runIdHash,
    'context.prune.strategy': strategy.strategy,
    'context.prune.strategy.action': strategy.action,
    'context.prune.strategy.candidate_count_bucket': countBucket(strategy.candidate_count),
    'context.prune.strategy.changed_count_bucket': countBucket(strategy.changed_count),
    'context.prune.strategy.protected_count_bucket': countBucket(strategy.protected_count),
    'context.prune.strategy.token_count.before_bucket': tokenBucket(strategy.token_count_before),
    'context.prune.strategy.token_count.removed_bucket': tokenBucket(strategy.token_count_removed),
    'context.prune.strategy.byte_count.removed_bucket': bytesBucket(strategy.byte_count_removed),
    'context.prune.strategy.reason_hash': sha256(strategy.reason),
    'context.prune.strategy.sample_hash': sha256(strategy.raw_sample),
    'context.prune.strategy.raw_text_recorded': false,
    'privacy.raw_session_recorded': false,
    'privacy.raw_tool_output_recorded': false,
    'privacy.raw_file_content_recorded': false
  }
}));

const completedEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.prune.completed',
  time: completed.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'context.prune.run_id_hash': runIdHash,
    'context.prune.status': completed.status,
    'context.prune.token_count.after_bucket': tokenBucket(completed.token_count_after),
    'context.prune.byte_count.after_bucket': bytesBucket(completed.byte_count_after),
    'context.prune.token_count.removed_bucket': tokenBucket(completed.total_token_count_removed),
    'context.prune.byte_count.removed_bucket': bytesBucket(completed.total_byte_count_removed),
    'context.prune.end_ratio_bucket': ratioBucket(completed.token_count_after, start.context_window_tokens),
    'context.prune.changed_item_count_bucket': countBucket(completed.changed_item_count),
    'context.prune.protected_item_count_bucket': countBucket(completed.protected_item_count),
    'context.prune.backup.verified': completed.backup_verified,
    'context.prune.summary.hash': sha256(completed.raw_summary),
    'context.prune.audit_gap': completed.audit_gap,
    'privacy.raw_session_recorded': false,
    'privacy.raw_summary_recorded': false,
    'privacy.raw_tool_output_recorded': false,
    'privacy.raw_file_content_recorded': false
  }
};

const events = [startedEvent, ...strategyEvents, completedEvent]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-context-pruning-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.pruning_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.context_prune',
              kind: 1,
              startTimeUnixNano: unixNano(start.time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'context.prune.run_id_hash': runIdHash,
                'context.prune.prescription': start.prescription,
                'context.prune.mode': start.mode,
                'context.prune.trigger': start.trigger
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
  'finance@acme.example',
  'Bearer private_fixture',
  'PAY-1234',
  '/workspace/acme',
  '/private/work/acme',
  'private support transcript',
  'internal deployment host',
  'private order',
  'auth header'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));
const strategyActionCounts = strategies.reduce((counts, strategy) => {
  counts[strategy.action] = (counts[strategy.action] ?? 0) + 1;
  return counts;
}, {});

const summary = {
  schema: 'pluribus.contextPruningReceipt.demo.v0',
  eventCount: events.length,
  strategyEvents: strategyEvents.length,
  strategyActionCounts,
  tokenBeforeBucket: startedEvent.attributes['context.prune.token_count.before_bucket'],
  tokenAfterBucket: completedEvent.attributes['context.prune.token_count.after_bucket'],
  tokenRemovedBucket: completedEvent.attributes['context.prune.token_count.removed_bucket'],
  changedItemCountBucket: completedEvent.attributes['context.prune.changed_item_count_bucket'],
  protectedItemCountBucket: completedEvent.attributes['context.prune.protected_item_count_bucket'],
  backupVerified: completedEvent.attributes['context.prune.backup.verified'],
  includesAuditGap: completedEvent.attributes['context.prune.audit_gap'],
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/pruning-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/pruning-otel-trace.json',
  lesson: 'Post-hoc context cleaning needs receipts for what was pruned, minified, stubbed, protected, backed up, and kept private; token savings alone do not prove safe context preservation.'
};

console.log(JSON.stringify(summary, null, 2));
