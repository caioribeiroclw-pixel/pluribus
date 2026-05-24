#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-subagent-delegation-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'subagent-delegation-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'subagent-delegation-otel-trace.json');

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
  return 'over_50k';
}

function lineBucket(value) {
  if (value < 50) return 'under_50';
  if (value < 250) return 'under_250';
  if (value < 1_000) return 'under_1k';
  return 'over_1k';
}

function byteBucket(value) {
  if (value < 10_000) return 'under_10k';
  if (value < 100_000) return 'under_100k';
  if (value < 1_000_000) return 'under_1m';
  return 'over_1m';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const delegation = records.find((record) => record.type === 'subagent.delegation.requested');
const capture = records.find((record) => record.type === 'subagent.tool_output.captured');
const summary = records.find((record) => record.type === 'subagent.summary.returned');
const budget = records.find((record) => record.type === 'parent.context_budget.evaluated');

if (!session || !delegation || !capture || !summary || !budget) {
  throw new Error(`Expected session.start, subagent.delegation.requested, subagent.tool_output.captured, subagent.summary.returned, and parent.context_budget.evaluated records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:subagent-delegation`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);
const childSpanId = sha256(`${traceSeed}:child`).replace('sha256:', '').slice(0, 16);

const events = [
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'subagent.delegation.requested',
    time: delegation.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'agent.name': session.agent,
      'subagent.delegation.operation_hash': hashRef(delegation.operation),
      'subagent.delegation.reason_hash': sha256(delegation.delegation_reason),
      'subagent.delegation.estimated_output_line_bucket': lineBucket(delegation.estimated_output_lines),
      'subagent.delegation.parent_context_before_bucket': tokenBucket(delegation.parent_context_before_tokens),
      'subagent.delegation.threshold_policy': 'delegate_outputs_over_50_lines',
      'privacy.raw_parent_prompt_recorded': false,
      'privacy.raw_operation_output_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: childSpanId,
    name: 'subagent.tool_output.captured',
    time: capture.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'subagent.role': capture.subagent_role,
      'subagent.operation_hash': hashRef(capture.operation),
      'subagent.tool.exit_code': capture.exit_code,
      'subagent.tool.output_line_bucket': lineBucket(capture.output_lines),
      'subagent.tool.output_byte_bucket': byteBucket(capture.output_bytes),
      'subagent.tool.output_hash': sha256(capture.raw_output_sample),
      'subagent.tool.path_hashes': capture.raw_paths.map((path) => hashRef(path)).join(','),
      'subagent.tool.output_entered_parent_context': false,
      'privacy.raw_tool_output_recorded': false,
      'privacy.raw_paths_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'subagent.summary.returned',
    time: summary.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'subagent.summary.hash': sha256(summary.summary_hash_input),
      'subagent.summary.char_bucket': byteBucket(summary.summary_chars),
      'subagent.summary.bullet_count': summary.summary_bullets,
      'subagent.summary.parent_received_raw_output': summary.parent_received_raw_output,
      'subagent.summary.parent_received_raw_paths': summary.parent_received_raw_paths,
      'subagent.summary.boundary': 'bounded_summary_only',
      'privacy.raw_summary_recorded': false,
      'privacy.raw_child_output_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'parent.context_budget.evaluated',
    time: budget.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'parent.context.after_bucket': tokenBucket(budget.parent_context_after_tokens),
      'parent.context.added_token_bucket': tokenBucket(budget.parent_added_tokens),
      'subagent.child_output_token_bucket': tokenBucket(budget.child_output_tokens),
      'subagent.context_savings.proven': budget.child_output_tokens > budget.parent_added_tokens,
      'subagent.delegation.audit_gap': 'receipt_proves_parent_boundary_not_summary_correctness',
      'privacy.raw_parent_note_recorded': false
    }
  }
].sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-subagent-delegation-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.subagent_delegation_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.parent_with_delegation',
              kind: 1,
              startTimeUnixNano: unixNano(delegation.time),
              endTimeUnixNano: unixNano(budget.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'subagent.delegation.policy': 'large_tool_output_to_isolated_subagent'
              }),
              events: events
                .filter((event) => event.span_id === spanId)
                .map((event) => ({
                  name: event.name,
                  timeUnixNano: unixNano(event.time),
                  attributes: attributesToOtel(event.attributes)
                }))
            },
            {
              traceId,
              spanId: childSpanId,
              parentSpanId: spanId,
              name: 'agent.subagent.validation_runner',
              kind: 1,
              startTimeUnixNano: unixNano(capture.time),
              endTimeUnixNano: unixNano(summary.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'subagent.role': capture.subagent_role,
                'subagent.output_boundary': 'raw_output_isolated_summary_returned'
              }),
              events: events
                .filter((event) => event.span_id === childSpanId)
                .map((event) => ({
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
  'private-checkout-api',
  'AZ-PRIVATE-7781',
  'jane@acme.example',
  '/work/acme/private-checkout-api',
  'AcmeSecretPaymentTokenFixture',
  'Internal Azure trace',
  'private Module Federation route'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));

const summaryOut = {
  schema: 'pluribus.subagentDelegationReceipt.demo.v0',
  eventCount: events.length,
  parentEvents: events.filter((event) => event.span_id === spanId).length,
  childEvents: events.filter((event) => event.span_id === childSpanId).length,
  childOutputTokenBucket: budget.child_output_tokens >= 10000 ? tokenBucket(budget.child_output_tokens) : tokenBucket(budget.child_output_tokens),
  parentAddedTokenBucket: tokenBucket(budget.parent_added_tokens),
  provesRawOutputStayedOutOfParent: capture.output_lines > 50 && summary.parent_received_raw_output === false,
  includesAuditGap: events.at(-1).attributes['subagent.delegation.audit_gap'],
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/subagent-delegation-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/subagent-delegation-otel-trace.json',
  lesson: 'Delegating bulky commands to subagents still needs a receipt: prove raw child tool output stayed isolated and only a bounded summary crossed back to the parent.'
};

console.log(JSON.stringify(summaryOut, null, 2));
