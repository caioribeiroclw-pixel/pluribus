#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-memory-consolidation-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'memory-consolidation-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'memory-consolidation-otel-trace.json');

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

function countBucket(value) {
  if (value === 0) return 'zero';
  if (value <= 5) return 'under_5';
  if (value <= 25) return 'under_25';
  return 'over_25';
}

function durationBucket(ms) {
  if (ms < 1_000) return 'under_1s';
  if (ms < 10_000) return 'under_10s';
  if (ms < 60_000) return 'under_60s';
  return 'over_60s';
}

function scoreBucket(value) {
  if (value < 0.4) return 'low';
  if (value < 0.7) return 'medium';
  if (value < 0.9) return 'high';
  return 'very_high';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const precheck = records.find((record) => record.type === 'memory.consolidation.precheck');
const cluster = records.find((record) => record.type === 'memory.consolidation.cluster.selected');
const output = records.find((record) => record.type === 'memory.consolidation.output.created');
const completed = records.find((record) => record.type === 'memory.consolidation.completed');

if (!session || !precheck || !cluster || !output || !completed) {
  throw new Error(`Expected session.start, memory.consolidation.precheck, cluster.selected, output.created, and completed records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:memory-consolidation`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const precheckEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'memory.consolidation.precheck',
  time: precheck.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'agent.name': session.agent,
    'memory.provider': precheck.provider,
    'memory.client': precheck.client,
    'memory.project.hash': hashRef(precheck.project),
    'memory.consolidation.mode': precheck.mode,
    'memory.consolidation.trigger': precheck.trigger,
    'memory.consolidation.horizon': precheck.horizon,
    'memory.consolidation.last_run_at_hash': hashRef(precheck.last_run_at),
    'memory.consolidation.candidate_count': precheck.candidate_count,
    'memory.consolidation.candidate_count_bucket': countBucket(precheck.candidate_count),
    'memory.consolidation.candidate_ids_hash': sha256(precheck.candidate_ids.join('\n')),
    'memory.consolidation.project_path_hash': sha256(precheck.project_path),
    'memory.consolidation.precheck_latency_bucket': durationBucket(precheck.latency_ms),
    'privacy.raw_candidate_text_recorded': false,
    'privacy.raw_project_path_recorded': false
  }
};

const clusterEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'memory.consolidation.cluster.selected',
  time: cluster.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'memory.consolidation.cluster.hash': hashRef(cluster.cluster_id),
    'memory.consolidation.cluster.strategy': cluster.strategy,
    'memory.consolidation.cluster.source_count': cluster.source_count,
    'memory.consolidation.cluster.source_ids_hash': sha256(cluster.source_ids.join('\n')),
    'memory.consolidation.cluster.topic_hash': sha256(cluster.topic),
    'memory.consolidation.cluster.similarity_bucket': cluster.similarity_bucket,
    'memory.consolidation.cluster.max_source_age_minutes_bucket': countBucket(cluster.max_source_age_minutes),
    'privacy.raw_cluster_notes_recorded': false,
    'privacy.raw_memory_text_recorded': false
  }
};

const outputEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'memory.consolidation.output.created',
  time: output.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'memory.consolidation.output.hash': hashRef(output.consolidated_id),
    'memory.consolidation.cluster.hash': hashRef(output.cluster_id),
    'memory.consolidation.output.source_ids_hash': sha256(output.source_ids.join('\n')),
    'memory.consolidation.output.memory_type': output.memory_type,
    'memory.consolidation.output.lineage_edge': output.lineage_edge,
    'memory.consolidation.output.content_hash': sha256(output.raw_consolidated_memory),
    'memory.consolidation.quality_score_before_bucket': scoreBucket(output.quality_score_before),
    'memory.consolidation.quality_score_after_bucket': scoreBucket(output.quality_score_after),
    'memory.consolidation.changed_entity_count_bucket': countBucket(output.changed_entities.length),
    'memory.consolidation.changed_entities_hash': sha256(output.changed_entities.join('\n')),
    'memory.consolidation.output_latency_bucket': durationBucket(output.latency_ms),
    'privacy.raw_consolidated_memory_recorded': false,
    'privacy.raw_entity_names_recorded': false
  }
};

const completedEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'memory.consolidation.completed',
  time: completed.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'memory.provider': completed.provider,
    'memory.client': completed.client,
    'memory.project.hash': hashRef(completed.project),
    'memory.consolidation.mode': completed.mode,
    'memory.consolidation.trigger': completed.trigger,
    'memory.consolidation.candidate_count': completed.candidate_count,
    'memory.consolidation.cluster_count': completed.cluster_count,
    'memory.consolidation.consolidated_count': completed.consolidated_count,
    'memory.consolidation.skipped_count': completed.skipped_count,
    'memory.consolidation.duration_bucket': durationBucket(completed.duration_ms),
    'memory.consolidation.latency_budget_bucket': durationBucket(completed.latency_budget_ms),
    'memory.consolidation.within_latency_budget': completed.duration_ms <= completed.latency_budget_ms,
    'memory.consolidation.status': completed.status,
    'memory.consolidation.next_cursor_hash': hashRef(completed.next_cursor),
    'memory.consolidation.audit_gap': 'receipt_proves_bounded_run_and_lineage_not_summary_correctness',
    'privacy.raw_operator_note_recorded': false,
    'privacy.raw_memory_text_recorded': false
  }
};

const events = [precheckEvent, clusterEvent, outputEvent, completedEvent]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-memory-consolidation-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.memory_consolidation_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.memory.consolidation',
              kind: 1,
              startTimeUnixNano: unixNano(precheck.time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'memory.consolidation.mode': completed.mode,
                'memory.consolidation.trigger': completed.trigger
              }),
              events: events.map((event) => ({
                name: event.name,
                timeUnixNano: unixNano(event.time),
                attributes: attributesToOtel(event.attributes)
              })),
              status: { code: 1 }
            }
          ]
        }
      ]
    }
  ]
};

writeFileSync(tracePath, `${JSON.stringify(trace, null, 2)}\n`);

console.log(`Wrote ${events.length} memory consolidation receipt events to ${receiptPath}`);
console.log(`Wrote OTel-style trace to ${tracePath}`);
