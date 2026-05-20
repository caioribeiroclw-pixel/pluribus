#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-session-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'session-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'session-otel-trace.json');

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function canonicalize(text) {
  return text.normalize('NFC').replace(/\r\n/g, '\n');
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
const contextRecords = records.filter((record) => record.type === 'context.input');

if (contextRecords.length === 0) {
  throw new Error(`No context.input records found in ${inputPath}`);
}

const sessionId = sessionStart.session_id ?? 'unknown-session';
const conversationId = sessionStart.conversation_id ?? sessionId;
const traceId = sha256(`${sessionId}:trace`).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${sessionId}:span`).replace('sha256:', '').slice(0, 16);

const events = contextRecords.map((record) => {
  const sourceText = record.source_text ?? '';
  const deliveredText = record.delivered_text ?? sourceText;
  const sourceCanonicalText = canonicalize(sourceText);
  const deliveredHash = sha256(deliveredText);
  const sourceIdentity = record.source_path ?? record.source_uri ?? 'unknown';
  const sourceAttributeKey = record.source_uri ? 'context.input.source.uri' : 'context.input.source.path';

  return {
    trace_id: traceId,
    span_id: spanId,
    name: 'context.input.loaded',
    time: record.time,
    attributes: {
      'context.input.kind': record.kind ?? 'unknown',
      [sourceAttributeKey]: sourceIdentity,
      'context.input.source.bytes_hash': sha256(sourceText),
      'context.input.source.canonical.form': 'otel.context.source.nfc_lf.v1_candidate',
      'context.input.source.canonical.hash': sha256(sourceCanonicalText),
      'context.input.source.canonicalization': 'utf8,unicode_nfc,crlf_to_lf',
      'context.input.delivered.hash': deliveredHash,
      'context.input.delivered.full_render.hash': deliveredHash,
      'context.input.delivered.full_render.status': 'available',
      'context.input.delivered.template_hash': '',
      'context.input.delivered.transform': record.delivery_transform ?? 'as-recorded-by-session-log',
      'context.input.delivered.nondeterministic': 'false',
      'context.input.delivered.truncated': 'false',
      'context.input.loaded_by': record.loaded_by ?? 'unknown',
      'context.input.activation': record.activation ?? 'unknown',
      'context.input.scope': record.scope ?? 'unknown',
      'context.input.applies_to': record.applies_to ?? sessionStart.agent ?? 'unknown',
      'context.input.why_loaded': record.why_loaded ?? 'unknown',
      'context.input.expected_benefit': record.expected_benefit ?? 'unknown',
      'context.input.duplicate.dedupe_key': `${conversationId}:${deliveredHash}`,
      'context.input.duplicate.dedupe_scope': 'conversation',
      'context.input.duplicate.suppression_policy': 'suppress_equal_dedupe_key_within_scope',
      'context.input.duplicate.role': 'selected',
      'context.input.duplicate.risk': 'unknown',
      'session.id': sessionId,
      'gen_ai.conversation.id': conversationId
    }
  };
});

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const eventTimes = records.map((record) => Date.parse(record.time)).filter(Number.isFinite);
const startTimeMs = Number.isFinite(Date.parse(sessionStart.time)) ? Date.parse(sessionStart.time) : Math.min(...eventTimes);
const endTimeMs = Number.isFinite(Date.parse(sessionEnd.time)) ? Date.parse(sessionEnd.time) : Math.max(...eventTimes) + 1;
const toolCallCount = records.filter((record) => record.type === 'tool.call').length;

const otlpTrace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-session-log-context-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.session_log_demo',
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
                'pluribus.session_log.tool_call.count': toolCallCount
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

const kindCounts = events.reduce((counts, event) => {
  const kind = event.attributes['context.input.kind'];
  counts[kind] = (counts[kind] ?? 0) + 1;
  return counts;
}, {});

console.log(JSON.stringify({
  schema: 'pluribus.contextInputEvidence.sessionLogDemo.v0',
  inputPath,
  receiptPath,
  tracePath,
  sessionId,
  conversationId,
  contextInputEventCount: events.length,
  toolCallCount,
  kindCounts,
  privacyDefault: 'outputs hashes, paths/uris, counts, categorical fields, and session identifiers; does not copy raw context text into receipts or trace events',
  lesson: 'A post-hoc session log can be converted into context.input.loaded SpanEvents without asking retrieval/search tools to inspect the whole transcript.'
}, null, 2));
