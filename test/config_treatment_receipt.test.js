import test from 'node:test'
import assert from 'node:assert/strict'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checkerPath = path.join(repoRoot, 'examples', 'config-treatment-receipts', 'check-config-treatment-receipt.mjs')
const fixturePath = path.join(repoRoot, 'examples', 'config-treatment-receipts', 'config-treatment-receipt.json')

test('config-treatment receipt checker validates the packaged fixture', () => {
  const result = spawnSync(process.execPath, [checkerPath, fixturePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /config treatment receipt ok: 3 target surfaces, 1 omitted private payload, verdict usable/)
  assert.match(result.stdout, /privacy ok: no raw rules\/prompts\/secrets\/customer data copied/)
})
