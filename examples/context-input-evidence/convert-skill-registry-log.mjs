#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-skill-registry-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'skill-registry-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'skill-registry-otel-trace.json');

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
const index = records.find((record) => record.type === 'skill.index');
if (!index) throw new Error(`No skill.index record found in ${inputPath}`);

const sessionId = index.session_id ?? 'demo-session-skill-registry';
const conversationId = index.conversation_id ?? sessionId;
const traceId = sha256(`${sessionId}:trace`).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${sessionId}:span`).replace('sha256:', '').slice(0, 16);

const events = records.map((record) => {
  const skillIdHash = record.skill_id ? sha256(record.skill_id) : undefined;
  const baseAttributes = {
    'session.id': sessionId,
    'gen_ai.conversation.id': record.conversation_id ?? conversationId,
    'context.skill.registry.scope': record.registry_scope ?? index.registry_scope ?? 'unknown',
    'context.skill.privacy.raw_body_exported': false,
    'context.skill.audit_gap': 'receipt proves registry/index/read/injection boundary, not semantic skill quality'
  };

  if (record.type === 'skill.index') {
    return {
      trace_id: traceId,
      span_id: spanId,
      name: 'context.skill.registry.index.loaded',
      time: record.time,
      attributes: {
        ...baseAttributes,
        'context.skill.index.strategy': record.index_strategy ?? 'unknown',
        'context.skill.candidate_count': record.candidate_skill_count ?? 0,
        'context.skill.indexed_count': record.indexed_skill_count ?? 0,
        'context.skill.index.hash': sha256(`${sessionId}:skill-index:${record.indexed_skill_count ?? 0}:${record.index_strategy ?? 'unknown'}`),
        'context.skill.index.token_bucket': record.index_token_bucket ?? 'unknown',
        'context.skill.body.token_bucket': record.body_token_bucket ?? 'not_loaded',
        'context.skill.cache.status': record.cache_status ?? 'unknown',
        'context.skill.injection.policy': record.injection_policy ?? 'unknown'
      }
    };
  }

  if (record.type === 'skill.store') {
    return {
      trace_id: traceId,
      span_id: spanId,
      name: 'context.skill.registry.skill.stored',
      time: record.time,
      attributes: {
        ...baseAttributes,
        'context.skill.id_hash': skillIdHash,
        'context.skill.source': record.source ?? 'unknown',
        'context.skill.store.reason': record.store_reason ?? 'unknown',
        'context.skill.body.hash': sha256(`${record.skill_id}:body:${record.body_token_bucket ?? 'unknown'}`),
        'context.skill.body.token_bucket': record.body_token_bucket ?? 'unknown',
        'context.skill.write.status': record.write_status ?? 'unknown'
      }
    };
  }

  if (record.type === 'skill.read') {
    return {
      trace_id: traceId,
      span_id: spanId,
      name: 'context.skill.registry.skill.read',
      time: record.time,
      attributes: {
        ...baseAttributes,
        'context.skill.id_hash': skillIdHash,
        'context.skill.read.reason': record.read_reason ?? 'unknown',
        'context.skill.body.hash': sha256(`${record.skill_id}:body:${record.body_token_bucket ?? 'unknown'}`),
        'context.skill.body.token_bucket': record.body_token_bucket ?? 'unknown',
        'context.skill.read.status': record.read_status ?? 'unknown'
      }
    };
  }

  if (record.type === 'skill.inject') {
    return {
      trace_id: traceId,
      span_id: spanId,
      name: 'context.skill.registry.skill.injected',
      time: record.time,
      attributes: {
        ...baseAttributes,
        'context.skill.id_hash': skillIdHash,
        'context.skill.injection.reason': record.injection_reason ?? 'unknown',
        'context.skill.delivered.hash': sha256(`${record.skill_id}:delivered:${record.delivered_token_bucket ?? 'unknown'}`),
        'context.skill.delivered.token_bucket': record.delivered_token_bucket ?? 'unknown',
        'context.skill.delivery.status': record.delivery_status ?? 'unknown',
        'context.skill.suppressed_count': record.suppressed_count ?? 0
      }
    };
  }

  if (record.type === 'skill.reuse') {
    const selectedCount = record.selected_count ?? 0;
    const decisiveCount = record.decisive_count ?? 0;
    const supportingCount = record.supporting_count ?? 0;
    const unusedCount = record.unused_count ?? 0;
    const unknownCount = record.unknown_count ?? 0;
    const accountedCount = decisiveCount + supportingCount + unusedCount + unknownCount;
    if (accountedCount !== selectedCount) {
      throw new Error(`Invalid skill reuse accounting: selected_count (${selectedCount}) must equal decisive + supporting + unused + unknown (${accountedCount})`);
    }

    return {
      trace_id: traceId,
      span_id: spanId,
      name: 'context.skill.registry.reuse.evaluated',
      time: record.time,
      attributes: {
        ...baseAttributes,
        'decision.id_hash': sha256(record.decision_id ?? 'unknown-decision'),
        'context.skill.id_hash': skillIdHash,
        'context.skill.selected_count': selectedCount,
        'context.skill.suppressed_count': record.suppressed_count ?? 0,
        'context.skill.relevance.decisive_count': decisiveCount,
        'context.skill.relevance.supporting_count': supportingCount,
        'context.skill.relevance.unused_count': unusedCount,
        'context.skill.relevance.unknown_count': unknownCount,
        'context.skill.relevance.accounted_count': accountedCount,
        'context.skill.relevance.invariant': 'selected_count == decisive_count + supporting_count + unused_count + unknown_count',
        'context.skill.relevance.outcome': record.outcome ?? 'unknown'
      }
    };
  }

  throw new Error(`Unsupported record type: ${record.type}`);
});

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const eventTimes = events.map((event) => Date.parse(event.time)).filter(Number.isFinite);
const startTimeMs = Math.min(...eventTimes);
const endTimeMs = Math.max(...eventTimes) + 1;

const otlpTrace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-skill-registry-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: { name: 'pluribus.skill_registry.demo', version: '0.0.0-fixture' },
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
                'gen_ai.agent.name': index.agent ?? 'unknown',
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
  'webhook secret',
  'sk_live_private_demo',
  '/private/work/acme',
  'customer payload'
];
const receiptText = readFileSync(receiptPath, 'utf8');
const traceText = readFileSync(tracePath, 'utf8');
for (const needle of rawLeakNeedles) {
  if (receiptText.includes(needle) || traceText.includes(needle)) {
    throw new Error(`Raw/private fixture content leaked into receipt or trace: ${needle}`);
  }
}

console.log(`Wrote ${events.length} skill registry receipt events to ${receiptPath}`);
console.log(`Wrote OTLP-style trace to ${tracePath}`);
