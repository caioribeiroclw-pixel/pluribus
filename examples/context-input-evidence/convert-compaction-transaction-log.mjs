#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-compaction-transaction-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'compaction-transaction-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'compaction-transaction-otel-trace.json');

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
  if (value < 200_000) return 'under_200k';
  return 'over_200k';
}

function countBucket(value) {
  if (value === 0) return 'zero';
  if (value <= 5) return 'under_5';
  if (value <= 25) return 'under_25';
  if (value <= 100) return 'under_100';
  if (value <= 500) return 'under_500';
  return 'over_500';
}

function durationBucket(value) {
  if (value < 1_000) return 'under_1s';
  if (value < 5_000) return 'under_5s';
  if (value < 15_000) return 'under_15s';
  if (value < 60_000) return 'under_60s';
  return 'over_60s';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const start = records.find((record) => record.type === 'context.compaction.transaction.started');
const attempt = records.find((record) => record.type === 'context.compaction.summary.attempted');
const rollback = records.find((record) => record.type === 'context.compaction.rollback.completed');
const completed = records.find((record) => record.type === 'context.compaction.transaction.completed');

if (!session || !start || !attempt || !rollback || !completed) {
  throw new Error(`Expected session.start, transaction.started, summary.attempted, rollback.completed, and transaction.completed records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${start.transaction_id}:compaction-transaction`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);
const transactionIdHash = hashRef(start.transaction_id);

const startEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.compaction.transaction.started',
  time: start.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'agent.name': session.agent,
    'context.compaction.transaction.id_hash': transactionIdHash,
    'context.compaction.attempt': start.attempt,
    'context.compaction.trigger': start.trigger,
    'context.compaction.reason': start.reason,
    'context.compaction.token_count.before_bucket': tokenBucket(start.context_token_count_before),
    'context.compaction.context_window_bucket': tokenBucket(start.context_window_tokens),
    'context.compaction.deferred_tool_registry.count_bucket': countBucket(start.deferred_tool_registry_count),
    'context.compaction.system_reminder_queue.count_bucket': countBucket(start.pending_system_reminder_count),
    'context.compaction.backup.id_hash': hashRef(start.backup_id),
    'context.compaction.active_task.hash': sha256(start.raw_active_task),
    'context.compaction.recent_tool_output.hash': sha256(start.raw_recent_tool_output),
    'context.compaction.deferred_tools.hash': sha256(start.raw_deferred_tools),
    'privacy.raw_prompt_recorded': false,
    'privacy.raw_tool_output_recorded': false,
    'privacy.raw_tool_registry_recorded': false,
    'privacy.raw_context_recorded': false
  }
};

const attemptEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.compaction.summary.attempted',
  time: attempt.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'context.compaction.transaction.id_hash': transactionIdHash,
    'context.compaction.summary.call_status': attempt.summary_call_status,
    'context.compaction.summary.duration_bucket': durationBucket(attempt.summary_duration_ms),
    'context.compaction.summary.candidate_available': attempt.candidate_summary_available,
    'context.compaction.summary.error_hash': sha256(attempt.raw_error),
    'context.compaction.summary.candidate_hash': attempt.candidate_summary_text ? sha256(attempt.candidate_summary_text) : '',
    'privacy.raw_error_recorded': false,
    'privacy.raw_summary_recorded': false,
    'privacy.raw_context_recorded': false
  }
};

const rollbackEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.compaction.rollback.completed',
  time: rollback.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'context.compaction.transaction.id_hash': transactionIdHash,
    'context.compaction.rollback.reason': rollback.rollback_reason,
    'context.compaction.swap_committed': rollback.swap_committed,
    'context.compaction.original_context_preserved': rollback.original_context_preserved,
    'context.compaction.backup_available': rollback.backup_available,
    'context.compaction.deferred_tool_registry_restored': rollback.deferred_tool_registry_restored,
    'context.compaction.system_reminder_queue_restored': rollback.system_reminder_queue_restored,
    'context.compaction.replayed_system_reminder.count_bucket': countBucket(rollback.replayed_system_reminder_count),
    'context.compaction.post_tokens_recorded_as_success': rollback.post_tokens_recorded_as_success,
    'context.compaction.rollback.note_hash': sha256(rollback.raw_rollback_note),
    'privacy.raw_rollback_note_recorded': false,
    'privacy.raw_tool_output_recorded': false,
    'privacy.raw_context_recorded': false
  }
};

const completedEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.compaction.transaction.completed',
  time: completed.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'context.compaction.transaction.id_hash': transactionIdHash,
    'context.compaction.transaction.status': completed.status,
    'context.compaction.authoritative_state': completed.authoritative_state,
    'context.compaction.token_count.after_bucket': tokenBucket(completed.context_token_count_after),
    'context.compaction.deferred_tool_registry.after_count_bucket': countBucket(completed.deferred_tool_registry_count_after),
    'context.compaction.system_reminder_queue.after_count_bucket': countBucket(completed.pending_system_reminder_count_after),
    'context.compaction.audit_gap': completed.audit_gap,
    'context.compaction.operator_summary.hash': sha256(completed.raw_operator_summary),
    'privacy.raw_operator_summary_recorded': false,
    'privacy.raw_prompt_recorded': false,
    'privacy.raw_context_recorded': false
  }
};

const events = [startEvent, attemptEvent, rollbackEvent, completedEvent]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-compaction-transaction-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.compaction_transaction_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.context_compaction_transaction',
              kind: 1,
              startTimeUnixNano: unixNano(start.time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.hash': sha256(session.workspace),
                'gen_ai.request.model': session.model,
                'context.compaction.transaction.id_hash': transactionIdHash,
                'context.compaction.transaction.status': completed.status,
                'context.compaction.swap_committed': rollback.swap_committed,
                'context.compaction.original_context_preserved': rollback.original_context_preserved
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
  'sk_live_private_compact_txn',
  'alice@example.com',
  '/private/work/acme',
  'customer retry payload',
  'internal-acme-prod-admin',
  'Restored /private/work/acme',
  'payment payload'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));

const summary = {
  schema: 'pluribus.compactionTransactionReceipt.demo.v0',
  eventCount: events.length,
  status: completed.status,
  swapCommitted: rollback.swap_committed,
  originalContextPreserved: rollback.original_context_preserved,
  backupAvailable: rollback.backup_available,
  deferredToolRegistryRestored: rollback.deferred_tool_registry_restored,
  systemReminderQueueRestored: rollback.system_reminder_queue_restored,
  postTokensRecordedAsSuccess: rollback.post_tokens_recorded_as_success,
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/compaction-transaction-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/compaction-transaction-otel-trace.json',
  lesson: 'Failed compaction should emit a transaction receipt that proves summary failure did not commit a context swap or replay stale tool/system-reminder state.'
};

console.log(JSON.stringify(summary, null, 2));
