#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-agentgateway-progressive-disclosure-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'agentgateway-progressive-disclosure-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'agentgateway-progressive-disclosure-otel-trace.json');

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
  if (value < 100) return 'under_100';
  if (value < 1_000) return 'under_1k';
  if (value < 10_000) return 'under_10k';
  if (value < 50_000) return 'under_50k';
  return 'over_50k';
}

function byteBucket(value) {
  if (value === 0) return 'zero';
  if (value < 1_000) return 'under_1kb';
  if (value < 10_000) return 'under_10kb';
  if (value < 100_000) return 'under_100kb';
  return 'over_100kb';
}

function countBucket(value) {
  if (value === 0) return 'zero';
  if (value <= 5) return 'under_5';
  if (value <= 25) return 'under_25';
  if (value <= 100) return 'under_100';
  return 'over_100';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const index = records.find((record) => record.type === 'mcp.gateway.index.loaded');
const schema = records.find((record) => record.type === 'mcp.gateway.tool_schema.loaded');
const invoke = records.find((record) => record.type === 'mcp.gateway.tool_invoked');
const completed = records.find((record) => record.type === 'mcp.gateway.session.completed');

if (!session || !index || !schema || !invoke || !completed) {
  throw new Error(`Expected session.start, mcp.gateway.index.loaded, mcp.gateway.tool_schema.loaded, mcp.gateway.tool_invoked, and mcp.gateway.session.completed records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:agentgateway-progressive-disclosure`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const events = [
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.gateway.index.loaded',
    time: index.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'agent.name': session.agent,
      'mcp.gateway.name': index.gateway,
      'mcp.gateway.tool_mode': index.mode,
      'mcp.gateway.visible_tools_hash': sha256(index.client_visible_tools.join('\n')),
      'mcp.gateway.visible_tool_count': index.client_visible_tools.length,
      'mcp.gateway.upstream_server_hash': hashRef(index.upstream_server),
      'mcp.gateway.upstream_tool_count_bucket': countBucket(index.upstream_tool_count),
      'mcp.gateway.full_schema_token_count_bucket': tokenBucket(index.full_upstream_schema_token_count),
      'mcp.gateway.visible_index_token_count_bucket': tokenBucket(index.visible_index_token_count),
      'mcp.gateway.full_upstream_schemas_loaded_at_startup': false,
      'privacy.raw_index_recorded': false,
      'privacy.raw_upstream_tool_schemas_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.gateway.tool_schema.loaded',
    time: schema.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'mcp.gateway.name': schema.gateway,
      'mcp.tool.name_hash': hashRef(schema.tool),
      'mcp.tool.schema_command_hash': hashRef(schema.schema_command),
      'mcp.tool.schema_hash': sha256(schema.raw_schema),
      'mcp.tool.schema_token_count_bucket': tokenBucket(schema.schema_token_count),
      'mcp.tool.schema_load_reason_hash': hashRef(schema.selection_reason),
      'mcp.tool.unselected_tools_hash': sha256(schema.unselected_tool_names.join('\n')),
      'mcp.tool.unselected_schema_loaded_count': schema.unselected_schema_loaded_count,
      'privacy.raw_tool_schema_recorded': false,
      'privacy.raw_unselected_tool_names_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.gateway.tool_invoked',
    time: invoke.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'mcp.gateway.name': invoke.gateway,
      'mcp.tool.name_hash': hashRef(invoke.tool),
      'mcp.tool_call.status': invoke.status,
      'mcp.tool_call.arguments_hash': sha256(invoke.raw_arguments),
      'mcp.tool_call.result_sample_hash': sha256(invoke.raw_result_sample),
      'mcp.tool_call.result_count_bucket': countBucket(invoke.result_count),
      'mcp.tool_call.latency_ms': invoke.latency_ms,
      'mcp.tool_call.response_size_bucket': byteBucket(invoke.response_bytes),
      'privacy.raw_tool_arguments_recorded': false,
      'privacy.raw_tool_results_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'mcp.gateway.session.completed',
    time: completed.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'mcp.gateway.session.status': completed.status,
      'mcp.gateway.full_upstream_schemas_loaded': completed.full_upstream_schemas_loaded,
      'mcp.gateway.loaded_tool_schema_count': completed.loaded_tool_schema_count,
      'mcp.gateway.invoked_tool_count': completed.invoked_tool_count,
      'mcp.gateway.progressive_disclosure.audit_gap': completed.audit_gap
    }
  }
];

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-agentgateway-progressive-disclosure-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.agentgateway_progressive_disclosure_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.mcp.gateway.progressive_disclosure',
              kind: 1,
              startTimeUnixNano: unixNano(index.time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'mcp.gateway.name': index.gateway,
                'mcp.gateway.tool_mode': index.mode,
                'mcp.gateway.disclosure.strategy': 'visible_index_then_get_tool_invoke_tool'
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
  'sk_live_gateway_fixture',
  'finance@acme.example',
  'private-enterprise-mcp',
  'support.ticket.search',
  'TICKET-private-001',
  'Stripe prod incident',
  'private-support-ops'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));

const summary = {
  schema: 'pluribus.agentgatewayProgressiveDisclosureReceipt.demo.v0',
  eventCount: events.length,
  visibleToolCount: index.client_visible_tools.length,
  upstreamToolCountBucket: events[0].attributes['mcp.gateway.upstream_tool_count_bucket'],
  fullSchemaTokenBucket: events[0].attributes['mcp.gateway.full_schema_token_count_bucket'],
  visibleIndexTokenBucket: events[0].attributes['mcp.gateway.visible_index_token_count_bucket'],
  loadedToolSchemaCount: completed.loaded_tool_schema_count,
  fullUpstreamSchemasLoaded: completed.full_upstream_schemas_loaded,
  includesArgumentsHash: Boolean(events[2].attributes['mcp.tool_call.arguments_hash']),
  includesResultSampleHash: Boolean(events[2].attributes['mcp.tool_call.result_sample_hash']),
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/agentgateway-progressive-disclosure-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/agentgateway-progressive-disclosure-otel-trace.json',
  lesson: 'MCP gateway progressive disclosure still needs receipts: prove the client saw only lightweight meta-tools/index, one full schema loaded on demand, one tool ran, and private schemas/queries/results stayed out of the trace.'
};

console.log(JSON.stringify(summary, null, 2));
