#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = join(here, 'skill-invocation-log.jsonl');
const receiptPath = join(here, 'skill-receipt.ndjson');
const tracePath = join(here, 'skill-otel-trace.json');

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
  throw new Error('skill-invocation-log.jsonl must contain a session.start record');
}

const skillRecords = records.filter((record) => record.type === 'skill.invoked');
const duplicateGroups = new Map();

for (const record of skillRecords) {
  const deliveredHash = sha256(record.delivered_text);
  const key = `${record.session_id ?? session.session_id}:${record.skill_id}:${record.activation}:${record.hook_event}:${deliveredHash}`;
  duplicateGroups.set(key, (duplicateGroups.get(key) ?? 0) + 1);
}

const events = skillRecords.map((record) => {
  const sourceBytesHash = sha256(record.source_text);
  const deliveredHash = sha256(record.delivered_text);
  const dedupeScope = 'conversation';
  const dedupeKey = `${dedupeScope}:${record.skill_id}:${record.activation}:${record.hook_event}:${deliveredHash}`;
  const duplicateCount = duplicateGroups.get(`${session.session_id}:${record.skill_id}:${record.activation}:${record.hook_event}:${deliveredHash}`) ?? 1;

  return {
    trace_id: 'demo-trace-skill-context-receipts',
    span_id: session.session_id,
    name: 'context.skill.invoked',
    time: record.time,
    attributes: {
      'context.input.kind': 'skill',
      'context.skill.id': record.skill_id,
      'context.skill.name': record.skill_name,
      'context.skill.plugin': record.plugin,
      'context.input.source.path': record.source_path,
      'context.input.source.bytes_hash': sourceBytesHash,
      'context.input.delivered.hash': deliveredHash,
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'context.input.loaded_by': record.activation.startsWith('hook_') ? 'hook' : 'skill-runtime',
      'context.input.activation': record.activation,
      'context.input.hook_event': record.hook_event,
      'context.input.scope': record.plugin === 'repo-local-skills' ? 'repo' : 'plugin',
      'context.input.applies_to': session.agent,
      'context.input.why_loaded': record.trigger,
      'context.input.expected_benefit': record.expected_benefit,
      'context.input.eval_gap': record.eval_gap,
      'context.input.duplicate.dedupe_key': dedupeKey,
      'context.input.duplicate.dedupe_scope': dedupeScope,
      'context.input.duplicate.suppression_policy': record.suppression_policy,
      'context.input.duplicate.role': record.duplicate_role,
      'context.input.duplicate.candidate_count': duplicateCount,
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
          'pluribus.demo': 'skill-context-receipts'
        })
      },
      scopeSpans: [
        {
          scope: { name: 'pluribus.context-input-evidence', version: '0.0.0-demo' },
          spans: [
            {
              traceId: 'demo-trace-skill-context-receipts',
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

const selected = events.filter((event) => event.attributes['context.input.duplicate.role'] === 'selected').length;
const suppressed = events.filter((event) => event.attributes['context.input.duplicate.role'] === 'suppressed').length;
const rawLeakStrings = ['Weekly brief\nSummarize', 'After a commit, check tests', 'Post-commit review checklist loaded'];
const traceText = JSON.stringify(trace);
const receiptText = events.map((event) => JSON.stringify(event)).join('\n');
const leaksRawText = rawLeakStrings.some((value) => traceText.includes(value) || receiptText.includes(value));

const summary = {
  schema: 'pluribus.skillContextReceipt.demo.v0',
  eventCount: events.length,
  selectedSkillLoads: selected,
  suppressedDuplicateLoads: suppressed,
  activations: [...new Set(events.map((event) => event.attributes['context.input.activation']))],
  hookEvents: [...new Set(events.map((event) => event.attributes['context.input.hook_event']))],
  includesExpectedBenefit: events.every((event) => Boolean(event.attributes['context.input.expected_benefit'])),
  includesEvalGap: events.every((event) => Boolean(event.attributes['context.input.eval_gap'])),
  rawTextCopiedToReceipt: leaksRawText,
  receiptPath: 'examples/context-input-evidence/skill-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/skill-otel-trace.json',
  lesson: 'Skill telemetry should prove invocation, activation, delivered identity, duplicate policy, expected benefit, and eval gaps without logging raw skill prompts.'
};

console.log(JSON.stringify(summary, null, 2));
