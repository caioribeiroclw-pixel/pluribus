import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const syncScript = path.join(repoRoot, 'scripts', 'sync-caio-diary.js')
test('handoff diary sync preserves the source byte-for-byte', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-diary-'))
  const sourcePath = path.join(dir, 'diary.md')
  const outputPath = path.join(dir, 'published-diary.md')
  const fixture = Buffer.from('# Diary\n\nAção, falha, aprendizado.\n', 'utf8')
  fs.writeFileSync(sourcePath, fixture)

  const result = spawnSync(
    process.execPath,
    [syncScript, sourcePath, '--output', outputPath],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  )

  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(fs.readFileSync(outputPath), fixture)
  assert.match(result.stdout, /Diary synchronized byte-for-byte/)
  assert.match(result.stdout, /sha256=[a-f0-9]{64}/)
})

test('handoff diary sync refuses likely credentials', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-diary-secret-'))
  const sourcePath = path.join(dir, 'diary.md')
  fs.writeFileSync(sourcePath, '# Diary\n\n_authToken=npm_abcdefghijklmnopqrstuvwxyz123456\n')

  const result = spawnSync(process.execPath, [syncScript, sourcePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Refusing to publish diary: likely secret matched/)
})
