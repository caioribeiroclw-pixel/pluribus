#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-context-selection-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'context-selection-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'context-selection-otel-trace.json');

function sha256(value) {
  return `sha256:${createHash('sha256').update(String(value)).digest('hex')}`;
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
  if (Array.isArray(value)) return { arrayValue: { values: value.map((item) => otelValue(item)) } };
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
const selection = records.find((record) => record.type === 'context.selection');
if (!selection) {
  throw new Error(`No context.selection record found in ${inputPath}`);
}

const inputs = records.filter((record) => record.type === 'context.input');
if (inputs.length === 0) {
  throw new Error(`No context.input records found in ${inputPath}`);
}

const relevance = records.find((record) => record.type === 'context.decision.relevance');
const sessionId = selection.session_id ?? 'demo-session-context-selection';
const conversationId = selection.conversation_id ?? sessionId;
const traceId = sha256(`${sessionId}:trace`).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${sessionId}:span`).replace('sha256:', '').slice(0, 16);

const inputEvents = inputs.map((record) => {
  const sourceIdentity = record.source_id ?? 'unknown-source';
  const sourceHash = sha256(sourceIdentity);
  const deliveredHash = sha256(`${sessionId}:${sourceIdentity}:${record.selection_rank ?? 'unknown'}:${record.token_bucket ?? 'unknown'}`);

  return {
    trace_id: traceId,
    span_id: spanId,
    name: 'context.input.loaded',
    time: record.time,
    attributes: {
      'session.id': sessionId,
      'gen_ai.conversation.id': conversationId,
      'context.input.kind': record.kind ?? 'unknown',
      'context.input.source.id_hash': sourceHash,
      'context.input.source.role': record.source_role ?? 'unknown',
      'context.input.selection.rank': record.selection_rank ?? 0,
      'context.input.selection.status': record.selection_status ?? 'unknown',
      'context.input.delivery.status': record.delivery_status ?? 'unknown',
      'context.input.delivered.hash': deliveredHash,
      'context.input.token_bucket': record.token_bucket ?? 'unknown',
      'context.input.audit_gap': 'hashes and counts prove selected/delivered identity, not semantic usefulness'
    }
  };
});

const selectionEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.input.selection.evaluated',
  time: selection.time,
  attributes: {
    'session.id': sessionId,
    'gen_ai.conversation.id': conversationId,
    'context.selection.strategy': selection.selection_strategy ?? 'unknown',
    'context.selection.policy': selection.selection_policy ?? 'unknown',
    'context.input.candidate_count': selection.candidate_count ?? inputs.length,
    'context.input.selected_count': selection.selected_count ?? inputs.length,
    'context.input.suppressed_count': selection.suppressed_count ?? 0,
    'context.input.delivered_hash_count': selection.delivered_hash_count ?? inputEvents.length,
    'context.input.selected_token_bucket': selection.selected_token_bucket ?? 'unknown',
    'context.input.suppressed_token_bucket': selection.suppressed_token_bucket ?? 'unknown',
    'context.selection.operator_question': selection.operator_question ?? 'did_we_load_too_much_or_the_wrong_context',
    'context.decision.relevance_evaluator': selection.decision_relevance_evaluator ?? 'not_available_yet',
    'context.selection.audit_gap': selection.audit_gap ?? 'selection receipt proves delivery pressure, not semantic relevance'
  }
};

const events = [selectionEvent, ...inputEvents];

if (relevance) {
  const relevantHashes = inputs
    .filter((input) => (relevance.relevant_selection_ranks ?? []).includes(input.selection_rank))
    .map((input) => sha256(`${sessionId}:${input.source_id}:${input.selection_rank}:${input.token_bucket}`));

  events.push({
    trace_id: traceId,
    span_id: spanId,
    name: 'context.decision.relevance.evaluated',
    time: relevance.time,
    attributes: {
      'session.id': sessionId,
      'gen_ai.conversation.id': conversationId,
      'decision.id_hash': sha256(relevance.decision_id ?? 'unknown-decision'),
      'context.input.selected_count': relevance.selected_count ?? selection.selected_count ?? inputs.length,
      'context.input.suppressed_count': relevance.suppressed_count ?? selection.suppressed_count ?? 0,
      'context.input.delivered_hash_count': relevance.delivered_hash_count ?? selection.delivered_hash_count ?? inputEvents.length,
      'context.decision.input_hashes': relevantHashes,
      'context.decision.relevance.outcome': relevance.relevance_outcome ?? 'unknown',
      'context.decision.evaluator': relevance.decision_relevance_evaluator ?? 'unknown',
      'context.decision.audit_gap': relevance.audit_gap ?? 'relevance is evaluator-derived; loaded receipts only prove delivery'
    }
  });
}

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const eventTimes = events.map((event) => Date.parse(event.time)).filter(Number.isFinite);
const startTimeMs = Math.min(...eventTimes);
const endTimeMs = Math.max(...eventTimes) + 1;

const otlpTrace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-context-selection-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: { name: 'pluribus.context_selection.demo', version: '0.0.0-fixture' },
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
                'gen_ai.agent.name': selection.agent ?? 'unknown',
                'gen_ai.operation.name': 'agent_session'
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

const rawLeakNeedles = [
  'Acme-Co',
  'Stripe prod incident',
  '/private/work/acme',
  'sk_live_private_demo',
  'private-demo-token',
  'customer request payload'
];
const receiptText = readFileSync(receiptPath, 'utf8');
const traceText = readFileSync(tracePath, 'utf8');
const leakedNeedles = rawLeakNeedles.filter((needle) => receiptText.includes(needle) || traceText.includes(needle));
if (leakedNeedles.length > 0) {
  throw new Error(`Raw private fixture strings leaked into receipt/trace: ${leakedNeedles.join(', ')}`);
}

console.log(JSON.stringify({
  schema: 'pluribus.contextSelectionOverSelectionDemo.v0',
  inputPath,
  receiptPath,
  tracePath,
  sessionId,
  eventCount: events.length,
  selectedCount: selection.selected_count,
  suppressedCount: selection.suppressed_count,
  deliveredHashCount: selection.delivered_hash_count,
  hasDecisionRelevanceEvent: Boolean(relevance),
  privacyDefault: 'outputs hashes, buckets, counts, ranks, categorical fields, and audit gaps; does not copy raw prompts, customer names, private paths, secrets, tool output, or memory bodies',
  lesson: 'The cheap first signal is over-selection: selected_count and delivered_hash_count can show too much context crossed the boundary before any relevance evaluator exists.'
}, null, 2));
