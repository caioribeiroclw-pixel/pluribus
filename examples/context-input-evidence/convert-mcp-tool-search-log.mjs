#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-mcp-tool-search-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'mcp-tool-search-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'mcp-tool-search-otel-trace.json');

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

function countBucket(value) {
  if (value === 0) return 'zero';
  if (value <= 5) return 'under_5';
  if (value <= 25) return 'under_25';
  return 'over_25';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const indexes = records.filter((record) => record.type === 'mcp.tool_index.loaded');
const search = records.find((record) => record.type === 'mcp.tool_search.performed');
const definition = records.find((record) => record.type === 'mcp.tool_definition.loaded');
const call = records.find((record) => record.type === 'mcp.tool_call.completed');

if (!session || indexes.length === 0 || !search || !definition || !call) {
  throw new Error(`Expected session.start, mcp.tool_index.loaded, mcp.tool_search.performed, mcp.tool_definition.loaded, and mcp.tool_call.completed records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:mcp-tool-search`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const indexEvents = indexes.map((record) => ({
  trace_id: traceId,
  span_id: spanId,
  name: 'mcp.tool_index.loaded',
  time: record.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'agent.name': session.agent,
    'mcp.server.name_hash': hashRef(record.server),
    'mcp.transport': record.transport,
    'mcp.tool_loading.strategy': record.startup_strategy,
    'mcp.tool.names_hash': sha256(record.tool_names.join('\n')),
    'mcp.tool.count': record.tool_names.length,
    'mcp.tool.full_definitions.loaded_at_startup': record.full_definitions_loaded,
    'mcp.tool.definition_token_count_bucket': tokenBucket(record.definition_token_count),
    'mcp.tool.index_token_count_bucket': tokenBucket(record.index_token_count),
    'mcp.tool.index_only': true,
    'privacy.raw_tool_definitions_recorded': false,
    'privacy.raw_tool_descriptions_recorded': false
  }
}));

const searchEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'mcp.tool_search.performed',
  time: search.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'mcp.tool_search.query_hash': sha256(search.raw_query),
    'mcp.tool_search.candidate_count_bucket': countBucket(search.candidate_count),
    'mcp.tool_search.selected_server_hash': hashRef(search.selected_server),
    'mcp.tool_search.selected_tool_hash': hashRef(search.selected_tool),
    'mcp.tool_search.selection_policy': search.selection_policy,
    'mcp.tool_search.loaded_definition_count': search.loaded_definition_count,
    'mcp.tool_search.unselected_definitions_loaded': 0,
    'privacy.raw_query_recorded': false,
    'privacy.raw_candidate_rationale_recorded': false
  }
};

const definitionEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'mcp.tool_definition.loaded',
  time: definition.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'mcp.server.name_hash': hashRef(definition.server),
    'mcp.tool.name_hash': hashRef(definition.tool),
    'mcp.tool.definition_hash': sha256(definition.raw_definition),
    'mcp.tool.definition_load_reason': definition.load_reason,
    'mcp.tool.definition_token_count_bucket': tokenBucket(definition.definition_token_count),
    'mcp.tool.definition_loaded_on_demand': true,
    'privacy.raw_tool_definition_recorded': false
  }
};

const callEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'mcp.tool_call.completed',
  time: call.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'mcp.server.name_hash': hashRef(call.server),
    'mcp.tool.name_hash': hashRef(call.tool),
    'mcp.tool_call.status': call.status,
    'mcp.tool_call.result_count_bucket': countBucket(call.result_count),
    'mcp.tool_call.arguments_hash': sha256(call.raw_arguments),
    'mcp.tool_call.result_sample_hash': sha256(call.raw_result_sample),
    'mcp.tool_search.audit_gap': 'receipt_proves_loaded_boundary_not_selection_optimality',
    'privacy.raw_tool_arguments_recorded': false,
    'privacy.raw_tool_results_recorded': false
  }
};

const events = [...indexEvents, searchEvent, definitionEvent, callEvent]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-mcp-tool-search-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.mcp_tool_search_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.mcp.tool_search',
              kind: 1,
              startTimeUnixNano: unixNano(indexes[0].time),
              endTimeUnixNano: unixNano(call.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'mcp.tool_loading.strategy': 'deferred_tool_loading',
                'mcp.server.count': indexes.length
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
  'private staging checkout failures',
  'private repo issue search',
  'Never expose enterprise URLs or tokens',
  'private observability tools',
  'sensitive customer-like fixture data',
  'payment token errors',
  'private-checkout-api',
  'internal trace IDs',
  'customer-like payload excerpts'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));

const summary = {
  schema: 'pluribus.mcpToolSearchReceipt.demo.v0',
  eventCount: events.length,
  indexedServers: indexes.length,
  startupFullDefinitionsLoaded: indexes.reduce((sum, record) => sum + record.full_definitions_loaded, 0),
  onDemandDefinitionsLoaded: search.loaded_definition_count,
  includesToolSearchQueryHash: Boolean(searchEvent.attributes['mcp.tool_search.query_hash']),
  includesAuditGap: callEvent.attributes['mcp.tool_search.audit_gap'],
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/mcp-tool-search-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/mcp-tool-search-otel-trace.json',
  lesson: 'Deferred MCP tool loading still needs receipts: prove which tool indexes were loaded, which full definition was expanded on demand, and which private query/results stayed out of the trace.'
};

console.log(JSON.stringify(summary, null, 2));
