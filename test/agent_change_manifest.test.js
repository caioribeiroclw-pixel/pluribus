import test from 'node:test'
import assert from 'node:assert/strict'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checkerPath = path.join(repoRoot, 'examples', 'agent-change-manifest', 'check-agent-change-manifest.mjs')
const fixturePath = path.join(repoRoot, 'examples', 'agent-change-manifest', 'agent-change-manifest.json')

test('agent-change-manifest checker validates the packaged fixture', () => {
  const result = spawnSync(process.execPath, [checkerPath, fixturePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /agent change manifest ok: 2 context refs, 2 commands, 2 not-checked items, verdict reviewable/)
  assert.match(result.stdout, /privacy ok: no raw prompts\/transcripts\/source\/secrets copied/)
})
