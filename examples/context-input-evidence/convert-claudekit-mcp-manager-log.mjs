#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-claudekit-mcp-manager-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'claudekit-mcp-manager-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'claudekit-mcp-manager-otel-trace.json');

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
  if (value < 100_000) return 'under_100k';
  return 'over_100k';
}

function countBucket(value) {
  if (value === 0) return 'zero';
  if (value <= 5) return 'under_5';
  if (value <= 25) return 'under_25';
  if (value <= 100) return 'under_100';
  if (value <= 500) return 'under_500';
  return 'over_500';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const parentContext = records.find((record) => record.type === 'mcp.manager.parent_context.evaluated');
const subagentBoot = records.find((record) => record.type === 'mcp.manager.subagent.booted');
const toolSelected = records.find((record) => record.type === 'mcp.manager.tool_selected');
const toolInvoked = records.find((record) => record.type === 'mcp.manager.tool_invoked');
const summaryReturned = records.find((record) => record.type === 'mcp.manager.parent_summary.returned');

if (!session || !parentContext || !subagentBoot || !toolSelected || !toolInvoked || !summaryReturned) {
  throw new Error(`Expected session.start and all mcp.manager.* records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:claudekit-mcp-manager`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const events = [
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.manager.parent_context.evaluated',
    time: parentContext.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'agent.name': session.agent,
      'mcp.manager.pattern': parentContext.pattern,
      'mcp.manager.parent_visible_skill_hash': hashRef(parentContext.parent_visible_skill),
      'mcp.manager.parent_visible_token_bucket': tokenBucket(parentContext.parent_visible_token_count),
      'mcp.manager.hidden_server_count_bucket': countBucket(parentContext.hidden_mcp_server_count),
      'mcp.manager.hidden_tool_schema_count_bucket': countBucket(parentContext.hidden_mcp_tool_schema_count),
      'mcp.manager.hidden_full_schema_token_bucket': tokenBucket(parentContext.hidden_full_schema_token_count),
      'mcp.manager.full_schemas_loaded_in_parent': false,
      'privacy.raw_parent_prompt_recorded': false,
      'privacy.raw_hidden_schemas_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.manager.subagent.booted',
    time: subagentBoot.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'mcp.manager.subagent_id_hash': hashRef(subagentBoot.subagent_id),
      'mcp.manager.tools_policy': subagentBoot.tools_policy,
      'mcp.manager.server_count_bucket': countBucket(subagentBoot.server_count),
      'mcp.manager.tool_schema_count_bucket': countBucket(subagentBoot.tool_schema_count),
      'mcp.manager.subagent_startup_token_bucket': tokenBucket(subagentBoot.startup_context_token_count),
      'mcp.manager.context_window_token_bucket': tokenBucket(subagentBoot.context_window_tokens),
      'privacy.raw_subagent_tool_catalog_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.manager.tool_selected',
    time: toolSelected.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'mcp.manager.selection_strategy': toolSelected.selection_strategy,
      'mcp.manager.selected_server_hash': hashRef(toolSelected.selected_server),
      'mcp.manager.selected_tool_hash': hashRef(toolSelected.selected_tool),
      'mcp.manager.candidate_tool_count_bucket': countBucket(toolSelected.candidate_tool_count),
      'mcp.manager.expanded_tool_count': toolSelected.expanded_tool_count,
      'mcp.manager.suppressed_tool_count_bucket': countBucket(toolSelected.suppressed_tool_count),
      'mcp.manager.selection_reason_hash': sha256(toolSelected.raw_selection_reason),
      'privacy.raw_selection_reason_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.manager.tool_invoked',
    time: toolInvoked.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'mcp.tool.name_hash': hashRef(toolInvoked.tool),
      'mcp.tool_call.status': toolInvoked.status,
      'mcp.tool_call.result_count_bucket': countBucket(toolInvoked.result_count),
      'mcp.tool_call.latency_ms': toolInvoked.latency_ms,
      'mcp.tool_call.arguments_hash': sha256(toolInvoked.raw_arguments),
      'mcp.tool_call.result_sample_hash': sha256(toolInvoked.raw_result_sample),
      'privacy.raw_tool_arguments_recorded': false,
      'privacy.raw_tool_results_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.manager.parent_summary.returned',
    time: summaryReturned.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'mcp.manager.summary.status': summaryReturned.status,
      'mcp.manager.summary_token_bucket': tokenBucket(summaryReturned.summary_token_count),
      'mcp.manager.parent_context_after_token_bucket': tokenBucket(summaryReturned.parent_context_token_count_after),
      'mcp.manager.summary_hash': sha256(summaryReturned.raw_summary),
      'mcp.manager.audit_gap': summaryReturned.audit_gap,
      'privacy.raw_summary_recorded': false
    }
  }
];

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-claudekit-mcp-manager-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.claudekit_mcp_manager_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.mcp.manager.subagent_boundary',
              kind: 1,
              startTimeUnixNano: unixNano(parentContext.time),
              endTimeUnixNano: unixNano(summaryReturned.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'mcp.manager.pattern': parentContext.pattern,
                'mcp.manager.receipt.scope': 'parent_vs_manager_subagent_context_budget'
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

writeFileSync(tracePath, `${JSON.stringify(trace, null, 2)}\n`);

const forbiddenRawStrings = [
  'Acme-Co',
  'sk_live_parent_fixture',
  'sk_live_manager_fixture',
  'finance@acme.example',
  'private-enterprise-mcp',
  'support.ticket.search',
  'TICKET-private-002',
  'Stripe prod incident',
  'billing account 4242'
];

const publicOutputs = `${readFileSync(receiptPath, 'utf8')}\n${readFileSync(tracePath, 'utf8')}`;
const leaked = forbiddenRawStrings.filter((value) => publicOutputs.includes(value));
if (leaked.length > 0) {
  throw new Error(`Receipt/trace leaked raw fixture strings: ${leaked.join(', ')}`);
}

console.log(JSON.stringify({
  input: inputPath,
  receipt: receiptPath,
  trace: tracePath,
  events: events.length,
  selectedToolExpandedCount: toolSelected.expanded_tool_count,
  suppressedToolCount: toolSelected.suppressed_tool_count,
  parentFullSchemasLoaded: false,
  forbiddenRawStringsChecked: forbiddenRawStrings.length
}, null, 2));
