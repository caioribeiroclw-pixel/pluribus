#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-subagent-toolsearch-propagation-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'subagent-toolsearch-propagation-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'subagent-toolsearch-propagation-otel-trace.json');

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
const probes = records.filter((record) => record.type === 'subagent.spawn.probe');
const completed = records.find((record) => record.type === 'subagent.toolsearch.matrix.completed');

if (!session || probes.length === 0 || !completed) {
  throw new Error(`Expected session.start, subagent.spawn.probe records, and subagent.toolsearch.matrix.completed in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:subagent-toolsearch-propagation`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const events = [
  ...probes.map((record) => ({
    trace_id: traceId,
    span_id: spanId,
    name: 'subagent.toolsearch.propagation.evaluated',
    time: record.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'agent.name': session.agent,
      'subagent.type_hash': hashRef(record.subagent_type),
      'subagent.spawn.path': record.spawn_path,
      'subagent.skill_context_active': record.skill_context_active,
      'subagent.parent_intermediate_tool_call_count_bucket': countBucket(record.parent_intermediate_tool_call_count),
      'subagent.tools.declaration_shape': record.tools_declaration_shape,
      'subagent.tools.toolsearch_declared': record.toolsearch_declared,
      'subagent.tools.toolsearch_exposed': record.toolsearch_exposed,
      'subagent.mcp.parent_server_count_bucket': countBucket(record.mcp_server_count_parent),
      'subagent.mcp.available_server_count_bucket': countBucket(record.mcp_server_count_subagent),
      'subagent.mcp.loaded_tool_definition_count_bucket': countBucket(record.loaded_tool_definition_count),
      'subagent.mcp.deferred_tool_definition_count_bucket': countBucket(record.deferred_tool_definition_count),
      'subagent.tools.filter_reason': record.filter_reason,
      'subagent.tools.declaration_hash': sha256(record.raw_tools_declaration),
      'privacy.raw_tools_declaration_recorded': false,
      'privacy.raw_tool_schemas_recorded': false,
      'privacy.raw_prompts_recorded': false,
      'privacy.raw_paths_recorded': false
    }
  })),
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'subagent.toolsearch.matrix.completed',
    time: completed.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'subagent.toolsearch.tested_axis': completed.tested_axis,
      'subagent.toolsearch.probe_count_bucket': countBucket(completed.probe_count),
      'subagent.toolsearch.passing_probe_count_bucket': countBucket(completed.passing_probe_count),
      'subagent.toolsearch.failing_probe_count_bucket': countBucket(completed.failing_probe_count),
      'subagent.toolsearch.recommended_next_probe_hash': hashRef(completed.recommended_next_probe),
      'subagent.toolsearch.audit_gap': completed.audit_gap
    }
  }
];

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-subagent-toolsearch-propagation-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.subagent_toolsearch_propagation_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.subagent.toolsearch.propagation',
              kind: 1,
              startTimeUnixNano: unixNano(probes[0].time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name_hash': hashRef(session.workspace),
                'gen_ai.request.model': session.model,
                'subagent.context.receipt.scope': 'toolsearch_propagation_matrix'
              }),
              events: events.map((event) => ({
                name: event.name,
                timeUnixNano: unixNano(event.time),
                attributes: attributesToOtel(event.attributes)
              })),
              status: { code: 1 }
            }
          ]
        }
      ]
    }
  ]
};

writeFileSync(tracePath, `${JSON.stringify(trace, null, 2)}\n`);

console.log(`Wrote ${receiptPath}`);
console.log(`Wrote ${tracePath}`);
