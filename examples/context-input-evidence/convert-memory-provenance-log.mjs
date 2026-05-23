#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-memory-provenance-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'memory-provenance-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'memory-provenance-otel-trace.json');

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
  if (typeof value === 'string') {
    if (value === 'true' || value === 'false') return { boolValue: value === 'true' };
    if (/^-?\d+$/.test(value)) return { intValue: value };
    return { stringValue: value };
  }
  if (value == null) return { stringValue: '' };
  return { stringValue: JSON.stringify(value) };
}

function attributesToOtel(attributes) {
  return Object.entries(attributes).map(([key, value]) => ({ key, value: otelValue(value) }));
}

const records = readJsonl(inputPath);
const sessionStart = records.find((record) => record.type === 'session.start') ?? {};
const memoryWrites = records.filter((record) => record.type === 'memory.entry.promoted' || record.type === 'memory.entry.corrected');
const hydrations = records.filter((record) => record.type === 'memory.bundle.hydrated');
const provenanceChecks = records.filter((record) => record.type === 'memory.provenance.evaluated');

if (memoryWrites.length === 0) {
  throw new Error(`No memory entry write/correction records found in ${inputPath}`);
}

const sessionId = sessionStart.session_id ?? 'unknown-session';
const conversationId = sessionStart.conversation_id ?? sessionId;
const traceId = sha256(`${sessionId}:team-memory-provenance-trace`).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${sessionId}:team-memory-provenance-span`).replace('sha256:', '').slice(0, 16);
const writesByEntry = new Map();

function baseAttributes(record) {
  return {
    'team_memory.team.hash': hashRef(record.team ?? sessionStart.team ?? ''),
    'team_memory.scope.hash': hashRef(record.scope ?? ''),
    'team_memory.visibility': record.visibility ?? 'unknown',
    'session.id': sessionId,
    'gen_ai.conversation.id': conversationId
  };
}

const writeEvents = memoryWrites.map((record) => {
  if (!Number.isInteger(record.sequence)) {
    throw new Error(`Memory write ${record.entry_id ?? '<unknown>'} is missing integer sequence`);
  }
  const entryVersions = writesByEntry.get(record.entry_id) ?? [];
  entryVersions.push(record);
  writesByEntry.set(record.entry_id, entryVersions);

  return {
    trace_id: traceId,
    span_id: spanId,
    name: record.type === 'memory.entry.corrected' ? 'team_memory.entry.corrected' : 'team_memory.entry.promoted',
    time: record.time,
    attributes: {
      ...baseAttributes(record),
      'team_memory.entry.id_hash': hashRef(record.entry_id ?? ''),
      'team_memory.entry.sequence': record.sequence,
      'team_memory.entry.operation': record.type.replace('memory.entry.', ''),
      'team_memory.entry.body_hash': sha256(record.raw_body ?? ''),
      'team_memory.entry.body_recorded': 'false',
      'team_memory.entry.previous.id_hash': record.supersedes_entry_id ? hashRef(record.supersedes_entry_id) : '',
      'team_memory.author.agent.id_hash': hashRef(record.author_agent_id ?? ''),
      'team_memory.author.human.id_hash': hashRef(record.author_human_id ?? ''),
      'team_memory.author.role': record.author_role ?? 'unknown',
      'team_memory.source.session.id_hash': hashRef(record.source_session_id ?? ''),
      'team_memory.source.compaction_epoch': record.source_compaction_epoch ?? 0,
      'team_memory.promotion.reason_hash': sha256(record.promotion_reason ?? ''),
      'team_memory.decision.scope': record.decision_scope ?? 'unknown',
      'team_memory.privacy.raw_body_recorded': 'false',
      'team_memory.privacy.raw_rationale_recorded': 'false'
    }
  };
});

const hydrationEvents = hydrations.map((record) => {
  const selectedIds = record.selected_entry_ids ?? [];
  const candidateIds = record.candidate_entry_ids ?? [];
  const suppressedIds = record.suppressed_entry_ids ?? [];
  const unknownAuthorIds = selectedIds.filter((entryId) => !writesByEntry.has(entryId));
  if (unknownAuthorIds.length > 0) {
    throw new Error(`Hydration selected entries without known provenance: ${unknownAuthorIds.join(', ')}`);
  }
  if ((record.loaded_sequence_min ?? 0) > (record.loaded_sequence_max ?? 0)) {
    throw new Error(`Hydration sequence range is not monotonic for ${record.team ?? '<unknown team>'}`);
  }

  return {
    trace_id: traceId,
    span_id: spanId,
    name: 'team_memory.bundle.hydrated',
    time: record.time,
    attributes: {
      ...baseAttributes(record),
      'team_memory.consumer.agent.id_hash': hashRef(record.consumer_agent_id ?? ''),
      'team_memory.ticket.id_hash': hashRef(record.ticket_id ?? ''),
      'team_memory.selection.policy': record.selection_policy ?? 'unknown',
      'team_memory.query.hash': sha256(record.query_text ?? ''),
      'team_memory.candidate.count': candidateIds.length,
      'team_memory.selected.count': selectedIds.length,
      'team_memory.suppressed.count': suppressedIds.length,
      'team_memory.selected.entry_ids_hash': sha256(selectedIds.map(hashRef).join('\n')),
      'team_memory.suppressed.entry_ids_hash': sha256(suppressedIds.map(hashRef).join('\n')),
      'team_memory.loaded.sequence_min': record.loaded_sequence_min ?? 0,
      'team_memory.loaded.sequence_max': record.loaded_sequence_max ?? 0,
      'team_memory.loaded.ordering': 'monotonic_team_memory_sequence',
      'team_memory.bundle.body_hash': sha256(record.raw_bundle ?? ''),
      'team_memory.bundle.body_recorded': 'false',
      'team_memory.privacy.raw_query_recorded': 'false',
      'team_memory.privacy.raw_bundle_recorded': 'false'
    }
  };
});

const provenanceEvents = provenanceChecks.map((record) => {
  const selectedCount = record.selected_count ?? 0;
  const knownAuthorCount = record.known_author_count ?? 0;
  const unknownAuthorCount = record.unknown_author_count ?? 0;
  const accountedRelevance = (record.decisive_count ?? 0)
    + (record.supporting_count ?? 0)
    + (record.unused_count ?? 0)
    + (record.unknown_relevance_count ?? 0);

  if (knownAuthorCount + unknownAuthorCount !== selectedCount) {
    throw new Error(`Author accounting invariant failed: selected_count != known_author_count + unknown_author_count`);
  }
  if (accountedRelevance !== selectedCount) {
    throw new Error(`Relevance accounting invariant failed: selected_count != decisive + supporting + unused + unknown`);
  }

  return {
    trace_id: traceId,
    span_id: spanId,
    name: 'team_memory.provenance.evaluated',
    time: record.time,
    attributes: {
      ...baseAttributes(record),
      'team_memory.consumer.agent.id_hash': hashRef(record.consumer_agent_id ?? ''),
      'team_memory.selected.count': selectedCount,
      'team_memory.selected.known_author_count': knownAuthorCount,
      'team_memory.selected.unknown_author_count': unknownAuthorCount,
      'team_memory.loaded.ordered_sequence_count': record.ordered_sequence_count ?? 0,
      'team_memory.relevance.decisive_count': record.decisive_count ?? 0,
      'team_memory.relevance.supporting_count': record.supporting_count ?? 0,
      'team_memory.relevance.unused_count': record.unused_count ?? 0,
      'team_memory.relevance.unknown_count': record.unknown_relevance_count ?? 0,
      'team_memory.accounting.invariant': 'selected_count == known_author_count + unknown_author_count && selected_count == decisive_count + supporting_count + unused_count + unknown_relevance_count',
      'team_memory.audit_gap': record.audit_gap ?? 'proves provenance and loading boundaries, not factual correctness'
    }
  };
});

const events = [...writeEvents, ...hydrationEvents, ...provenanceEvents]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const eventTimes = records.map((record) => Date.parse(record.time)).filter(Number.isFinite);
const startTimeMs = Number.isFinite(Date.parse(sessionStart.time)) ? Date.parse(sessionStart.time) : Math.min(...eventTimes);
const endTimeMs = Math.max(...eventTimes) + 1;

const otlpTrace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-team-memory-provenance-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.team_memory_provenance_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.session',
              kind: 1,
              startTimeUnixNano: `${BigInt(startTimeMs) * 1_000_000n}`,
              endTimeUnixNano: `${BigInt(endTimeMs) * 1_000_000n}`,
              attributes: attributesToOtel({
                'session.id': sessionId,
                'gen_ai.conversation.id': conversationId,
                'gen_ai.agent.name': sessionStart.agent ?? 'unknown',
                'gen_ai.operation.name': 'agent_session',
                'code.repository.name': sessionStart.repo ?? '',
                'pluribus.team_memory.write.count': writeEvents.length,
                'pluribus.team_memory.hydration.count': hydrationEvents.length,
                'pluribus.team_memory.provenance_evaluation.count': provenanceEvents.length
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

writeFileSync(tracePath, `${JSON.stringify(otlpTrace, null, 2)}\n`);

console.log(JSON.stringify({
  schema: 'pluribus.contextInputEvidence.teamMemoryProvenanceDemo.v0',
  inputPath,
  receiptPath,
  tracePath,
  sessionId,
  conversationId,
  writeEventCount: writeEvents.length,
  hydrationEventCount: hydrationEvents.length,
  provenanceEvaluationEventCount: provenanceEvents.length,
  invariant: 'each hydrated memory has known author provenance, monotonic order, and selected_count accounting for author + relevance buckets',
  privacyDefault: 'outputs hashes, counts, buckets, roles, scope, and sequence numbers; does not copy raw memory bodies, prompts, tickets, private paths, secrets, or customer data',
  lesson: 'Team memory needs provenance receipts: who/which agent wrote or corrected each memory, in what order, and which entries actually hydrated into the receiving agent context.'
}, null, 2));
