#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-code-search-retrieval-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'code-search-retrieval-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'code-search-retrieval-otel-trace.json');

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
  if (value <= 1_000) return 'under_1k';
  return 'over_1k';
}

function tokenBucket(value) {
  if (value < 1_000) return 'under_1k';
  if (value < 5_000) return 'under_5k';
  if (value < 10_000) return 'under_10k';
  return 'over_10k';
}

function scoreBucket(score) {
  if (score >= 0.9) return 'very_high';
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

function lineRangeBucket(result) {
  const lineCount = Math.max(0, Number(result.end_line) - Number(result.start_line) + 1);
  if (lineCount <= 25) return 'under_25_lines';
  if (lineCount <= 100) return 'under_100_lines';
  return 'over_100_lines';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const snapshot = records.find((record) => record.type === 'code.index.snapshot.used');
const search = records.find((record) => record.type === 'code.search.performed');
const returned = records.find((record) => record.type === 'code.search.results.returned');
const loaded = records.find((record) => record.type === 'context.input.loaded');

if (!session || !snapshot || !search || !returned || !loaded) {
  throw new Error(`Expected session.start, code.index.snapshot.used, code.search.performed, code.search.results.returned, and context.input.loaded records in ${inputPath}`);
}

const results = returned.results ?? [];
const traceSeed = `${session.session_id}:${session.conversation_id}:code-search-retrieval`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);
const loadedIds = new Set(loaded.loaded_chunk_ids ?? []);
const suppressedIds = new Set(loaded.suppressed_chunk_ids ?? []);

const snapshotEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'code.index.snapshot.used',
  time: snapshot.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'agent.name': session.agent,
    'code_search.index.snapshot_id_hash': hashRef(snapshot.index_snapshot_id),
    'code_search.codebase.path_hash': sha256(snapshot.codebase_path),
    'code_search.git.commit_hash': sha256(snapshot.git_commit),
    'code_search.indexed_file_count_bucket': countBucket(snapshot.indexed_file_count),
    'code_search.indexed_chunk_count_bucket': countBucket(snapshot.indexed_chunk_count),
    'code_search.embedding.provider_hash': hashRef(snapshot.embedding_provider),
    'code_search.embedding.model_hash': hashRef(snapshot.embedding_model),
    'code_search.snapshot.status': snapshot.snapshot_status,
    'privacy.raw_codebase_path_recorded': false,
    'privacy.raw_embedding_config_recorded': false
  }
};

const searchEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'code.search.performed',
  time: search.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'code_search.query_hash': sha256(search.raw_query),
    'code_search.query_category': search.query_category,
    'code_search.filter_hash': sha256(search.filter),
    'code_search.top_k': search.top_k,
    'code_search.candidate_count_bucket': countBucket(search.candidate_count),
    'code_search.index.snapshot_id_hash': hashRef(search.index_snapshot_id),
    'privacy.raw_query_recorded': false,
    'privacy.raw_filter_recorded': false,
    'audit_gap': 'proves search request identity and candidate scale, not semantic relevance'
  }
};

const resultEvents = results.map((result) => ({
  trace_id: traceId,
  span_id: spanId,
  name: 'code.search.result.returned',
  time: returned.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'code_search.index.snapshot_id_hash': hashRef(returned.index_snapshot_id),
    'code_search.result.rank': result.rank,
    'code_search.result.score_bucket': scoreBucket(result.score),
    'code_search.result.chunk_id_hash': hashRef(result.chunk_id),
    'code_search.result.chunk_text_hash': sha256(result.raw_chunk_text),
    'code_search.result.path_hash': sha256(result.path),
    'code_search.result.path_extension': extname(result.path).slice(1) || 'none',
    'code_search.result.line_range_bucket': lineRangeBucket(result),
    'code_search.result.stale': Boolean(result.stale),
    'code_search.result.duplicate_of_hash': result.duplicate_of ? hashRef(result.duplicate_of) : '',
    'code_search.result.loaded_into_agent_context': loadedIds.has(result.chunk_id),
    'code_search.result.suppressed_before_agent_context': suppressedIds.has(result.chunk_id),
    'code_search.result.suppression_reason': loaded.suppression_reasons?.[result.chunk_id] ?? '',
    'privacy.raw_code_chunk_recorded': false,
    'privacy.raw_path_recorded': false
  }
}));

const loadedEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'context.input.loaded',
  time: loaded.time,
  attributes: {
    'session.id': session.session_id,
    'gen_ai.conversation.id': session.conversation_id,
    'context.input.kind': 'retrieved_code_chunks',
    'context.input.source': 'code_search',
    'context.input.client_transform': loaded.client_transform,
    'context.input.loaded_chunk_count': loadedIds.size,
    'context.input.suppressed_chunk_count': suppressedIds.size,
    'context.input.loaded_chunk_ids_hash': sha256([...loadedIds].sort().join('\n')),
    'context.input.suppressed_chunk_ids_hash': sha256([...suppressedIds].sort().join('\n')),
    'context.input.prompt_token_bucket': tokenBucket(loaded.prompt_token_count),
    'context.input.raw_prompt_hash': sha256(loaded.raw_prompt_fragment),
    'privacy.raw_prompt_recorded': false,
    'privacy.raw_code_chunks_recorded': false,
    'privacy.raw_paths_recorded': false,
    'audit_gap': 'proves returned-vs-loaded boundary, not answer correctness or retrieval optimality'
  }
};

const events = [snapshotEvent, searchEvent, ...resultEvents, loadedEvent]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time) || left.name.localeCompare(right.name));

writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-code-search-retrieval-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.code_search_retrieval_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session.code_search_retrieval',
              kind: 1,
              startTimeUnixNano: unixNano(snapshot.time),
              endTimeUnixNano: unixNano(loaded.time),
              attributes: attributesToOtel({
                'session.id': session.session_id,
                'gen_ai.conversation.id': session.conversation_id,
                'agent.name': session.agent,
                'workspace.name_hash': hashRef(session.workspace),
                'gen_ai.request.model': session.model,
                'code_search.query_category': search.query_category
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
  '/Users/alex/src/acme-payments/private-monorepo',
  'Acme-Co',
  'sk_live_private_fixture',
  'finance-vp@acme.example',
  'sso.internal.acme.example',
  'tok_private_fixture',
  'ACME-7391',
  '+1-555-0100',
  'https://acme.example/private/sso',
  'src/auth/session-renewal.ts',
  'src/auth/sso/failover.ts',
  'src/billing/stripe-session.ts',
  'docs/runbooks/sso-failover.md'
];

const receiptText = readFileSync(receiptPath, 'utf8');
const traceText = readFileSync(tracePath, 'utf8');
const leaked = forbiddenRawStrings.filter((value) => receiptText.includes(value) || traceText.includes(value));
if (leaked.length > 0) {
  throw new Error(`Receipt leaked raw private fixture strings: ${leaked.join(', ')}`);
}

console.log(JSON.stringify({
  schema: 'pluribus.codeSearchRetrievalReceipt.demo.v0',
  eventCount: events.length,
  returnedResultCount: results.length,
  loadedChunkCount: loadedIds.size,
  suppressedChunkCount: suppressedIds.size,
  staleReturnedCount: results.filter((result) => result.stale).length,
  duplicateReturnedCount: results.filter((result) => result.duplicate_of).length,
  rawCodeCopiedToReceipt: false,
  rawPathsCopiedToReceipt: false,
  rawQueryCopiedToReceipt: false,
  receiptPath: 'examples/context-input-evidence/code-search-retrieval-receipt.ndjson',
  tracePath: 'examples/context-input-evidence/code-search-retrieval-otel-trace.json',
  lesson: 'Code-search tools should attest returned result identities separately from what the agent actually loaded, without exposing raw code or private paths.'
}, null, 2));
