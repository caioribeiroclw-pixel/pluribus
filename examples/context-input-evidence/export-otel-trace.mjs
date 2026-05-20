#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const receiptPath = join(here, 'receipt.ndjson');
const outputPath = join(here, 'otel-trace.json');

function unixNano(isoTimestamp) {
  return `${BigInt(Date.parse(isoTimestamp)) * 1_000_000n}`;
}

function otelValue(value) {
  if (typeof value === 'boolean') {
    return { boolValue: value };
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return { intValue: String(value) };
  }

  if (typeof value === 'number') {
    return { doubleValue: value };
  }

  if (typeof value === 'string') {
    if (value === 'true' || value === 'false') {
      return { boolValue: value === 'true' };
    }

    if (/^-?\d+$/.test(value)) {
      return { intValue: value };
    }

    return { stringValue: value };
  }

  if (value == null) {
    return { stringValue: '' };
  }

  return { stringValue: JSON.stringify(value) };
}

function attributesToOtel(attributes) {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value: otelValue(value)
  }));
}

const events = readFileSync(receiptPath, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (events.length === 0) {
  throw new Error(`No context.input.loaded events found in ${receiptPath}`);
}

const sessionId = events[0].attributes['session.id'];
const eventTimes = events.map((event) => Date.parse(event.time));
const startTimeMs = Math.min(...eventTimes);
const endTimeMs = Math.max(...eventTimes) + 1;

const otlpTrace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-context-input-evidence-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId: '11111111111111111111111111111111',
              spanId: '2222222222222222',
              parentSpanId: '',
              name: 'agent.session',
              kind: 1,
              startTimeUnixNano: `${BigInt(startTimeMs) * 1_000_000n}`,
              endTimeUnixNano: `${BigInt(endTimeMs) * 1_000_000n}`,
              attributes: attributesToOtel({
                'session.id': sessionId,
                'gen_ai.conversation.id': sessionId,
                'gen_ai.agent.name': 'context-input-evidence-demo',
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

writeFileSync(outputPath, `${JSON.stringify(otlpTrace, null, 2)}\n`);

const loadedEvents = otlpTrace.resourceSpans[0].scopeSpans[0].spans[0].events;
const suppressionPolicies = new Set(events.map((event) => event.attributes['context.input.duplicate.suppression_policy']));
const fullRenderStatuses = new Set(events.map((event) => event.attributes['context.input.delivered.full_render.status']));

console.log(JSON.stringify({
  schema: 'pluribus.contextInputEvidence.otelTraceFixture.v0',
  sourceReceipt: 'examples/context-input-evidence/receipt.ndjson',
  otelTracePath: 'examples/context-input-evidence/otel-trace.json',
  sessionId,
  spanName: 'agent.session',
  eventCount: loadedEvents.length,
  suppressionPolicyCount: suppressionPolicies.size,
  fullRenderStatusCount: fullRenderStatuses.size,
  lesson: 'Context input evidence fits naturally as SpanEvents on a session/agent span, preserving privacy-first hashes and categorical receipt fields without logging raw prompt text.'
}, null, 2));
