#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-memory-governance-delete-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'memory-governance-delete-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'memory-governance-delete-otel-trace.json');

function sha256(value) {
  return `sha256:${createHash('sha256').update(value ?? '').digest('hex')}`;
}

function hashRef(value) {
  return sha256(value ?? '').slice(0, 19);
}

function hashList(values = []) {
  return sha256(values.join('\n'));
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

function countBucket(value) {
  if (value === 0) return 'zero';
  if (value <= 2) return 'under_2';
  if (value <= 5) return 'under_5';
  return 'over_5';
}

function durationBucket(ms) {
  if (ms < 1_000) return 'under_1s';
  if (ms < 10_000) return 'under_10s';
  return 'over_10s';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const requested = records.find((record) => record.type === 'memory.governance.delete.requested');
const candidates = records.find((record) => record.type === 'memory.governance.delete.candidates.presented');
const confirmation = records.find((record) => record.type === 'memory.governance.delete.confirmation.recorded');
const completed = records.find((record) => record.type === 'memory.governance.delete.completed');
const audit = records.find((record) => record.type === 'memory.governance.audit.completed');

if (!session || !requested || !candidates || !confirmation || !completed || !audit) {
  throw new Error(`Expected session.start and all memory.governance.delete/audit records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:memory-governance-delete`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const baseAttrs = {
  'session.id': session.session_id,
  'gen_ai.conversation.id': session.conversation_id,
  'agent.name': session.agent,
  'memory.provider': session.provider,
  'memory.client': session.client,
  'memory.project.hash': hashRef(session.project)
};

const events = [
  {
    name: 'memory.governance.delete.requested',
    time: requested.time,
    attributes: {
      ...baseAttrs,
      'memory.governance.request.hash': hashRef(requested.request_id),
      'memory.governance.trigger': requested.trigger,
      'memory.governance.requested_by_hash': hashRef(requested.requested_by),
      'memory.governance.reason_hash': sha256(requested.reason),
      'memory.governance.query_hash': sha256(requested.query),
      'memory.governance.scope': requested.scope,
      'memory.governance.delete.policy': requested.policy,
      'memory.governance.sensitive_class_count': requested.sensitive_classes.length,
      'memory.governance.sensitive_classes_hash': hashList(requested.sensitive_classes),
      'memory.governance.project_path_hash': sha256(requested.project_path),
      'privacy.raw_query_recorded': false,
      'privacy.raw_reason_recorded': false,
      'privacy.raw_project_path_recorded': false
    }
  },
  {
    name: 'memory.governance.delete.candidates.presented',
    time: candidates.time,
    attributes: {
      ...baseAttrs,
      'memory.governance.request.hash': hashRef(candidates.request_id),
      'memory.governance.candidate_count': candidates.candidate_count,
      'memory.governance.candidate_count_bucket': countBucket(candidates.candidate_count),
      'memory.governance.candidate_ids_hash': hashList(candidates.candidate_ids),
      'memory.governance.preview_policy': candidates.preview_policy,
      'memory.governance.preview_hash': sha256(candidates.previewed_candidate_text.join('\n')),
      'memory.governance.requires_confirmation': candidates.requires_confirmation,
      'privacy.raw_candidate_text_recorded': false,
      'privacy.raw_preview_recorded': false
    }
  },
  {
    name: 'memory.governance.delete.confirmation.recorded',
    time: confirmation.time,
    attributes: {
      ...baseAttrs,
      'memory.governance.request.hash': hashRef(confirmation.request_id),
      'memory.governance.confirmation.hash': hashRef(confirmation.confirmation_id),
      'memory.governance.confirmed': confirmation.confirmed,
      'memory.governance.confirmation_channel': confirmation.confirmation_channel,
      'memory.governance.confirmed_candidate_count': confirmation.confirmed_candidate_ids.length,
      'memory.governance.confirmed_candidate_ids_hash': hashList(confirmation.confirmed_candidate_ids),
      'memory.governance.rejected_candidate_count': confirmation.rejected_candidate_ids.length,
      'memory.governance.rejected_candidate_ids_hash': hashList(confirmation.rejected_candidate_ids),
      'memory.governance.operator_note_hash': sha256(confirmation.operator_note),
      'privacy.raw_operator_note_recorded': false
    }
  },
  {
    name: 'memory.governance.delete.completed',
    time: completed.time,
    attributes: {
      ...baseAttrs,
      'memory.governance.request.hash': hashRef(completed.request_id),
      'memory.governance.status': completed.status,
      'memory.governance.deleted_count': completed.deleted_ids.length,
      'memory.governance.deleted_ids_hash': hashList(completed.deleted_ids),
      'memory.governance.retained_count': completed.retained_ids.length,
      'memory.governance.retained_ids_hash': hashList(completed.retained_ids),
      'memory.governance.tombstone_count': completed.tombstone_ids.length,
      'memory.governance.tombstone_ids_hash': hashList(completed.tombstone_ids),
      'memory.governance.audit_entry_hash': hashRef(completed.audit_entry_id),
      'memory.governance.store_snapshot_before_hash': sha256(completed.store_snapshot_before),
      'memory.governance.store_snapshot_after_hash': sha256(completed.store_snapshot_after),
      'memory.governance.latency_bucket': durationBucket(completed.latency_ms),
      'privacy.raw_deleted_memory_recorded': false
    }
  },
  {
    name: 'memory.governance.audit.completed',
    time: audit.time,
    attributes: {
      ...baseAttrs,
      'memory.governance.request.hash': hashRef(audit.request_id),
      'memory.governance.audit_entry_hash': hashRef(audit.audit_entry_id),
      'memory.governance.query_replay_result_count': audit.query_replay_result_count,
      'memory.governance.tombstone_count': audit.tombstone_count,
      'memory.governance.retained_count': audit.retained_count,
      'memory.governance.retention_policy': audit.retention_policy,
      'memory.governance.audit_gap': audit.audit_gap,
      'privacy.raw_memory_body_recorded': false,
      'privacy.raw_delete_query_recorded': false
    }
  }
].map((event) => ({ trace_id: traceId, span_id: spanId, ...event }));

const receipt = events.map((event) => JSON.stringify(event)).join('\n') + '\n';
writeFileSync(receiptPath, receipt);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-context-input-evidence-demo',
          'service.version': '0.3.23'
        })
      },
      scopeSpans: [
        {
          scope: { name: 'pluribus.context_input_evidence.memory_governance_delete', version: '0.1.0' },
          spans: [
            {
              traceId,
              spanId,
              name: 'agent.session',
              kind: 1,
              startTimeUnixNano: unixNano(session.time),
              endTimeUnixNano: unixNano(audit.time),
              attributes: attributesToOtel(baseAttrs),
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
console.log(`wrote ${events.length} memory governance delete receipt events to ${receiptPath}`);
console.log(`wrote OpenTelemetry-style trace to ${tracePath}`);
