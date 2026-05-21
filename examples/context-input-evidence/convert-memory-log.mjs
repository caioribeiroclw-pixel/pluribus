#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-memory-retrieval-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'memory-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'memory-otel-trace.json');

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function hashRef(value) {
  return sha256(value ?? '').slice(0, 19);
}

function canonicalize(text) {
  return text.normalize('NFC').replace(/\r\n/g, '\n');
}

function scoreBucket(score) {
  if (score >= 0.9) return 'very_high';
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  if (score > 0) return 'low';
  return 'unknown';
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
  if (typeof value === 'string') {
    if (value === 'true' || value === 'false') return { boolValue: value === 'true' };
    if (/^-?\d+$/.test(value)) return { intValue: value };
    return { stringValue: value };
  }
  if (value == null) return { stringValue: '' };
  return { stringValue: JSON.stringify(value) };
}

function attributesToOtel(attributes) {
  return Object.entries(attributes).map(([key, value]) => ({ key, value: otelValue(value) }));
}

const records = readJsonl(inputPath);
const sessionStart = records.find((record) => record.type === 'session.start') ?? {};
const sessionEnd = [...records].reverse().find((record) => record.type === 'session.end') ?? {};
const retrievalRecords = records.filter((record) => record.type === 'memory.search');
const loadedRecords = records.filter((record) => record.type === 'context.input');

if (retrievalRecords.length === 0) {
  throw new Error(`No memory.search records found in ${inputPath}`);
}

const sessionId = sessionStart.session_id ?? 'unknown-session';
const conversationId = sessionStart.conversation_id ?? sessionId;
const traceId = sha256(`${sessionId}:memory-trace`).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${sessionId}:memory-span`).replace('sha256:', '').slice(0, 16);

const searchEvents = retrievalRecords.map((record) => {
  const resultHashes = (record.results ?? []).map((result) => sha256(result.text ?? ''));
  const resultIdHashes = (record.results ?? []).map((result) => hashRef(result.id ?? result.uri ?? ''));
  const topResult = (record.results ?? [])[0] ?? {};

  return {
    trace_id: traceId,
    span_id: spanId,
    name: 'memory.search.returned',
    time: record.time,
    attributes: {
      'memory.provider': record.provider ?? 'unknown',
      'memory.client': record.client ?? 'unknown',
      'memory.project.hash': hashRef(record.project ?? ''),
      'memory.retrieval.id_hash': hashRef(record.retrieval_id ?? ''),
      'memory.query.hash': sha256(record.query_text ?? ''),
      'memory.snapshot.id_hash': hashRef(record.snapshot_id ?? ''),
      'memory.result.count': (record.results ?? []).length,
      'memory.result.ids_hash': sha256(resultIdHashes.join('\n')),
      'memory.result.payloads_hash': sha256(resultHashes.join('\n')),
      'memory.result.top.id_hash': hashRef(topResult.id ?? topResult.uri ?? ''),
      'memory.result.top.score_bucket': scoreBucket(topResult.score ?? 0),
      'memory.latency_ms': record.latency_ms ?? 0,
      'memory.privacy.raw_query_recorded': 'false',
      'memory.privacy.raw_result_recorded': 'false',
      'session.id': sessionId,
      'gen_ai.conversation.id': conversationId
    }
  };
});

const loadEvents = loadedRecords.map((record) => {
  const deliveredText = record.delivered_text ?? '';
  const deliveredCanonicalText = canonicalize(deliveredText);
  const deliveredHash = sha256(deliveredText);
  const duplicateRole = record.duplicate_role ?? 'selected';

  return {
    trace_id: traceId,
    span_id: spanId,
    name: 'context.input.loaded',
    time: record.time,
    attributes: {
      'context.input.kind': record.kind ?? 'mcp_memory',
      'context.input.source.uri_hash': hashRef(record.source_uri ?? ''),
      'context.input.source.memory_id_hash': hashRef(record.memory_id ?? record.source_uri ?? ''),
      'context.input.source.bytes_hash': sha256(deliveredText),
      'context.input.source.canonical.form': 'otel.context.source.nfc_lf.v1_candidate',
      'context.input.source.canonical.hash': sha256(deliveredCanonicalText),
      'context.input.source.canonicalization': 'utf8,unicode_nfc,crlf_to_lf',
      'context.input.delivered.hash': deliveredHash,
      'context.input.delivered.full_render.hash': deliveredHash,
      'context.input.delivered.full_render.status': 'available',
      'context.input.delivered.transform': 'as-returned-by-memory-client',
      'context.input.delivered.nondeterministic': 'false',
      'context.input.delivered.truncated': 'false',
      'context.input.loaded_by': record.loaded_by ?? 'unknown',
      'context.input.activation': record.activation ?? 'unknown',
      'context.input.scope': record.scope ?? 'unknown',
      'context.input.applies_to': record.applies_to ?? sessionStart.agent ?? 'unknown',
      'context.input.why_loaded': record.why_loaded ?? 'unknown',
      'context.input.expected_benefit': record.expected_benefit ?? 'unknown',
      'context.input.retrieval.id_hash': hashRef(record.retrieval_id ?? ''),
      'context.input.memory.id_hash': hashRef(record.memory_id ?? record.source_uri ?? ''),
      'context.input.duplicate.dedupe_key': `${conversationId}:${deliveredHash}`,
      'context.input.duplicate.dedupe_scope': 'conversation',
      'context.input.duplicate.suppression_policy': duplicateRole === 'candidate_duplicate'
        ? 'keep_distinct_cross_client_load_until_loaded_receipt_proves_suppression'
        : 'suppress_equal_dedupe_key_within_scope',
      'context.input.duplicate.role': duplicateRole,
      'context.input.duplicate.risk': duplicateRole === 'candidate_duplicate' ? 'cross_client_duplicate_possible' : 'unknown',
      'session.id': sessionId,
      'gen_ai.conversation.id': conversationId
    }
  };
});

const events = [...searchEvents, ...loadEvents].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const eventTimes = records.map((record) => Date.parse(record.time)).filter(Number.isFinite);
const startTimeMs = Number.isFinite(Date.parse(sessionStart.time)) ? Date.parse(sessionStart.time) : Math.min(...eventTimes);
const endTimeMs = Number.isFinite(Date.parse(sessionEnd.time)) ? Date.parse(sessionEnd.time) : Math.max(...eventTimes) + 1;

const otlpTrace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-shared-memory-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.memory_receipt_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session',
              kind: 1,
              startTimeUnixNano: `${BigInt(startTimeMs) * 1_000_000n}`,
              endTimeUnixNano: `${BigInt(endTimeMs) * 1_000_000n}`,
              attributes: attributesToOtel({
                'session.id': sessionId,
                'gen_ai.conversation.id': conversationId,
                'gen_ai.agent.name': sessionStart.agent ?? 'unknown',
                'gen_ai.operation.name': 'agent_session',
                'code.repository.name': sessionStart.repo ?? '',
                'pluribus.memory_search.count': retrievalRecords.length,
                'pluribus.memory_load.count': loadedRecords.length
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

writeFileSync(tracePath, `${JSON.stringify(otlpTrace, null, 2)}\n`);

console.log(JSON.stringify({
  schema: 'pluribus.contextInputEvidence.memoryReceiptDemo.v0',
  inputPath,
  receiptPath,
  tracePath,
  sessionId,
  conversationId,
  memorySearchEventCount: searchEvents.length,
  contextInputEventCount: loadEvents.length,
  privacyDefault: 'outputs hashes, counts, buckets, categorical fields, and session identifiers; does not copy raw query text, memory contents, prompts, tool arguments, secrets, or transcript bodies',
  lesson: 'Shared-memory clients need two receipts: what memory search returned and what the harness actually loaded into context.'
}, null, 2));
