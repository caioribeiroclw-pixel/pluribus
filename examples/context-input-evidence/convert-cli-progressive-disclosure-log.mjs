#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-cli-progressive-disclosure-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'cli-progressive-disclosure-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'cli-progressive-disclosure-otel-trace.json');

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
  return 'over_25';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const prompt = records.find((record) => record.type === 'cli.agent_prompt.loaded');
const help = records.find((record) => record.type === 'cli.command_help.loaded');
const command = records.find((record) => record.type === 'cli.command.executed');
const completed = records.find((record) => record.type === 'cli.session.completed');

if (!session || !prompt || !help || !command || !completed) {
  throw new Error(`Expected session.start, cli.agent_prompt.loaded, cli.command_help.loaded, cli.command.executed, and cli.session.completed records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:cli-progressive-disclosure`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const events = [
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'cli.agent_prompt.loaded',
    time: prompt.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'agent.name': session.agent,
      'cli.name': prompt.cli_name,
      'cli.prompt.command_hash': hashRef(prompt.prompt_command),
      'cli.prompt.hash': sha256(prompt.raw_prompt),
      'cli.prompt.token_count_bucket': tokenBucket(prompt.prompt_token_count),
      'cli.full_openapi.token_count_bucket': tokenBucket(prompt.full_openapi_token_count),
      'cli.full_mcp_schema.token_count_bucket': tokenBucket(prompt.full_mcp_schema_token_count),
      'cli.startup.strategy': prompt.startup_strategy,
      'cli.install.target': prompt.install_target,
      'privacy.raw_agent_prompt_recorded': false,
      'privacy.raw_openapi_recorded': false,
      'privacy.raw_mcp_schemas_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'cli.command_help.loaded',
    time: help.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'cli.name': help.cli_name,
      'cli.command.hash': hashRef(help.command),
      'cli.help.command_hash': hashRef(help.help_command),
      'cli.help.hash': sha256(help.raw_help),
      'cli.help.token_count_bucket': tokenBucket(help.help_token_count),
      'cli.help.load_reason_hash': hashRef(help.selection_reason),
      'cli.unselected_commands.hash': sha256(help.unselected_commands.join('\n')),
      'cli.unselected_help.loaded_count': help.unselected_help_loaded,
      'privacy.raw_help_recorded': false,
      'privacy.raw_unselected_commands_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'cli.command.executed',
    time: command.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'cli.name': command.cli_name,
      'cli.command.hash': hashRef(command.command),
      'cli.command.status': command.status,
      'cli.command.arguments_hash': sha256(command.raw_arguments),
      'cli.command.result_sample_hash': sha256(command.raw_result_sample),
      'cli.command.result_count_bucket': countBucket(command.result_count),
      'cli.command.latency_ms': command.latency_ms,
      'cli.command.stdout_size_bucket': byteBucket(command.stdout_bytes),
      'cli.command.stderr_size_bucket': byteBucket(command.stderr_bytes),
      'privacy.raw_arguments_recorded': false,
      'privacy.raw_results_recorded': false
    }
  },
  {
    trace_id: traceId,
    span_id: spanId,
    name: 'cli.session.completed',
    time: completed.time,
    attributes: {
      'session.id': session.session_id,
      'gen_ai.conversation.id': session.conversation_id,
      'cli.session.status': completed.status,
      'cli.commands.executed': completed.commands_executed,
      'cli.command_help.loaded_count': completed.loaded_command_help_count,
      'cli.full_openapi.loaded': completed.loaded_full_openapi,
      'cli.full_mcp_schemas.loaded': completed.loaded_mcp_schemas,
      'cli.progressive_disclosure.audit_gap': completed.audit_gap
    }
  }
];

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-cli-progressive-disclosure-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.cli_progressive_disclosure_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.cli.progressive_disclosure',
              kind: 1,
              startTimeUnixNano: unixNano(prompt.time),
              endTimeUnixNano: unixNano(completed.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name': session.workspace,
                'gen_ai.request.model': session.model,
                'cli.name': prompt.cli_name,
                'cli.disclosure.strategy': 'agent_prompt_then_command_help'
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
  'private payroll sync payloads',
  'private-checkout-api',
  'sk_live_private_fixture',
  'cus_private_001',
  'finance@acme.example',
  'Stripe prod incident',
  'conn_acme_private'
];
const exportedText = `${events.map((event) => JSON.stringify(event)).join('\n')}\n${JSON.stringify(trace)}`;
const rawTextCopiedToReceipt = forbiddenRawStrings.some((value) => exportedText.includes(value));

const summary = {
  schema: 'pluribus.cliProgressiveDisclosureReceipt.demo.v0',
  eventCount: events.length,
  startupPromptTokenBucket: events[0].attributes['cli.prompt.token_count_bucket'],
  fullOpenApiTokenBucket: events[0].attributes['cli.full_openapi.token_count_bucket'],
  fullMcpSchemaTokenBucket: events[0].attributes['cli.full_mcp_schema.token_count_bucket'],
  loadedCommandHelpCount: completed.loaded_command_help_count,
  loadedFullOpenApi: completed.loaded_full_openapi,
  loadedFullMcpSchemas: completed.loaded_mcp_schemas,
  includesArgumentsHash: Boolean(events[2].attributes['cli.command.arguments_hash']),
  includesResultSampleHash: Boolean(events[2].attributes['cli.command.result_sample_hash']),
  rawTextCopiedToReceipt,
  receiptPath: 'examples/context-input-evidence/cli-progressive-disclosure-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/cli-progressive-disclosure-otel-trace.json',
  lesson: 'CLI progressive disclosure still needs receipts: prove a tiny agent prompt loaded, exactly one command help expanded, one command ran, and private arguments/results stayed out of the trace.'
};

console.log(JSON.stringify(summary, null, 2));
