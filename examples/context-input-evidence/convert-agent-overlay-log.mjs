#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = join(here, 'agent-overlay-log.jsonl');
const receiptPath = join(here, 'agent-overlay-receipt.ndjson');
const tracePath = join(here, 'agent-overlay-otel-trace.json');

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function parseJsonl(filePath) {
  return readFileSync(filePath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function attributeValue(value) {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') return { intValue: value };
  return { stringValue: String(value ?? '') };
}

function toOtelAttributes(attributes) {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value: attributeValue(value)
  }));
}

const records = parseJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
if (!session) {
  throw new Error('agent-overlay-log.jsonl must contain a session.start record');
}

const contextRecords = records.filter((record) => record.type === 'agent_context.loaded');
const events = contextRecords.map((record) => {
  const loaded = record.activation !== 'not_loaded_wrong_agent' && record.delivered_text.length > 0;
  const sourceBytesHash = sha256(record.source_text);
  const deliveredHash = loaded ? sha256(record.delivered_text) : '';

  return {
    trace_id: 'demo-trace-agent-overlays',
    span_id: session.session_id,
    name: loaded ? 'context.input.loaded' : 'context.input.candidate_suppressed',
    time: record.time,
    attributes: {
      'context.input.kind': 'agent_instructions',
      'context.input.source.path': record.source_path,
      'context.input.source.role': record.source_role,
      'context.input.source.bytes_hash': sourceBytesHash,
      'context.input.delivered.hash': deliveredHash,
      'context.input.delivered.truncated': false,
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'agent.name': session.agent,
      'workspace.name': session.workspace,
      'context.input.loaded_by': loaded ? 'native-file-discovery' : 'overlay-selector',
      'context.input.activation': record.activation,
      'context.input.scope': 'repo',
      'context.input.applies_to': record.target_agent,
      'context.input.load_order': record.load_order,
      'context.input.composition_policy': record.composition_policy,
      'context.input.fallback_policy': record.fallback_policy,
      'context.input.why_loaded': record.why_loaded,
      'context.input.expected_benefit': record.expected_benefit,
      'context.input.duplicate.dedupe_scope': 'conversation',
      'context.input.duplicate.suppression_policy': loaded
        ? 'keep_distinct_source_roles_in_order'
        : 'suppress_overlay_for_non_target_agent',
      'context.input.duplicate.role': loaded ? 'selected' : 'suppressed',
      'privacy.raw_context_recorded': false,
      'privacy.raw_prompt_recorded': false,
      'privacy.raw_tool_args_recorded': false
    }
  };
});

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: toOtelAttributes({
          'service.name': 'pluribus-context-input-evidence',
          'telemetry.sdk.language': 'javascript',
          'pluribus.demo': 'agent-overlay-receipts'
        })
      },
      scopeSpans: [
        {
          scope: { name: 'pluribus.context-input-evidence', version: '0.0.0-demo' },
          spans: [
            {
              traceId: 'demo-trace-agent-overlays',
              spanId: session.session_id,
              name: 'agent.session',
              kind: 'SPAN_KIND_INTERNAL',
              startTimeUnixNano: '0',
              endTimeUnixNano: '0',
              attributes: toOtelAttributes({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'privacy.raw_context_recorded': false
              }),
              events: events.map((event) => ({
                name: event.name,
                timeUnixNano: '0',
                attributes: toOtelAttributes(event.attributes)
              }))
            }
          ]
        }
      ]
    }
  ]
};

writeFileSync(tracePath, `${JSON.stringify(trace, null, 2)}\n`);

const loaded = events.filter((event) => event.name === 'context.input.loaded');
const suppressed = events.filter((event) => event.name === 'context.input.candidate_suppressed');
const rawLeakStrings = [
  'Prefer small reviewable changes',
  'Cursor-specific workspace rule hints',
  'Codex-specific sandbox notes'
];
const traceText = JSON.stringify(trace);
const receiptText = events.map((event) => JSON.stringify(event)).join('\n');
const leaksRawText = rawLeakStrings.some((value) => traceText.includes(value) || receiptText.includes(value));

const summary = {
  schema: 'pluribus.agentOverlayReceipt.demo.v0',
  eventCount: events.length,
  loadedContextInputs: loaded.length,
  suppressedOverlayCandidates: suppressed.length,
  loadedSourceRoles: loaded.map((event) => event.attributes['context.input.source.role']),
  compositionPolicies: [...new Set(events.map((event) => event.attributes['context.input.composition_policy']))],
  includesLoadOrder: events.every((event) => Number.isInteger(event.attributes['context.input.load_order'])),
  rawTextCopiedToReceipt: leaksRawText,
  receiptPath: 'examples/context-input-evidence/agent-overlay-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/agent-overlay-otel-trace.json',
  lesson: 'Agent-specific AGENTS.md overlays need load-order, target-agent, fallback, and suppression receipts; otherwise composition is a naming convention, not evidence.'
};

console.log(JSON.stringify(summary, null, 2));
