import test from 'node:test'
import assert from 'node:assert/strict'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checkerPath = path.join(repoRoot, 'examples', 'evidence-attestation', 'check-evidence-attestation.mjs')
const fixturePath = path.join(repoRoot, 'examples', 'evidence-attestation', 'evidence-attestation.json')

test('evidence-attestation checker validates the packaged fixture', () => {
  const result = spawnSync(process.execPath, [checkerPath, fixturePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /evidence attestation ok: 3 evidence refs, 4 claims, 3 supported, 1 unresolved, verdict review_required/)
  assert.match(result.stdout, /privacy ok: no raw prompts\/transcripts\/source\/secrets\/customer data copied/)
})
