import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const converterPath = path.join(repoRoot, 'examples', 'context-input-evidence', 'convert-context-selection-log.mjs')
const fixtureDir = path.join(repoRoot, 'examples', 'context-input-evidence')

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-context-selection-'))
}

function runConverter(inputPath, outputDir = tempDir()) {
  return spawnSync(process.execPath, [
    converterPath,
    inputPath,
    path.join(outputDir, 'receipt.ndjson'),
    path.join(outputDir, 'trace.json')
  ], { encoding: 'utf8' })
}

test('Project Telos load-only fixture is valid but does not claim usefulness', () => {
  const result = runConverter(path.join(fixtureDir, 'sample-project-telos-load-only-log.jsonl'))

  assert.equal(result.status, 0, result.stderr)
  const summary = JSON.parse(result.stdout)
  assert.equal(summary.eventCount, 4)
  assert.equal(summary.hasDecisionRelevanceEvent, false)
  assert.equal(summary.decisionClaim, 'valid_load_receipt_not_usefulness_claim')
})

test('context relevance must join back to delivered input ranks', () => {
  const dir = tempDir()
  const inputPath = path.join(dir, 'broken-join.jsonl')
  fs.writeFileSync(inputPath, [
    JSON.stringify({
      type: 'context.selection',
      time: '2026-06-28T14:00:00.000Z',
      session_id: 'broken-join-session',
      candidate_count: 2,
      selected_count: 1,
      suppressed_count: 1,
      delivered_hash_count: 1
    }),
    JSON.stringify({
      type: 'context.input',
      time: '2026-06-28T14:00:01.000Z',
      session_id: 'broken-join-session',
      kind: 'source_document',
      source_id: 'delivered-source',
      selection_rank: 1,
      selection_status: 'selected',
      delivery_status: 'delivered',
      token_bucket: '0-1k'
    }),
    JSON.stringify({
      type: 'context.decision.relevance',
      time: '2026-06-28T14:05:00.000Z',
      session_id: 'broken-join-session',
      selected_count: 1,
      decisive_selection_ranks: [99],
      supporting_selection_ranks: [],
      unused_selection_ranks: [],
      unknown_selection_ranks: []
    })
  ].join('\n') + '\n')

  const result = runConverter(inputPath, dir)

  assert.equal(result.status, 1)
  assert.match(result.stderr, /relevance ranks must join to delivered context\.input records; missing ranks: 99/)
})
