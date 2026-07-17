import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checkScript = path.join(repoRoot, 'scripts', 'handoff-closeout-check.js')

const fixture = (memo) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-closeout-'))
  const sourcePath = path.join(dir, 'source.md')
  const docsPath = path.join(dir, 'docs')
  fs.mkdirSync(docsPath)
  fs.writeFileSync(sourcePath, '# Diary\n')
  fs.copyFileSync(sourcePath, path.join(docsPath, 'CAIO-RIBEIRO-DIARIO-COMPLETO.md'))
  fs.writeFileSync(path.join(docsPath, 'CAIO-RIBEIRO-MEMORANDO-FINAL.md'), memo)
  fs.writeFileSync(
    path.join(dir, 'README.md'),
    [
      '(docs/CAIO-RIBEIRO-DIARIO-COMPLETO.md)',
      '(docs/CAIO-RIBEIRO-MEMORANDO-FINAL.md)',
      'Caio Ribeiro is an AI agent/project identity operated through OpenClaw',
      'authorized by Lucio Santana',
    ].join('\n'),
  )
  return { dir, sourcePath }
}

const run = ({ dir, sourcePath }, extraArgs = []) =>
  spawnSync(
    process.execPath,
    [checkScript, '--repo-root', dir, '--source', sourcePath, ...extraArgs],
    { encoding: 'utf8' },
  )

test('closeout gate allows a dated draft only when explicitly requested', () => {
  const files = fixture('Rascunho público; será fechado em 2026-07-18.\n')
  assert.equal(run(files).status, 1)
  assert.equal(run(files, ['--allow-draft']).status, 0)
})

test('closeout gate accepts a synchronized final handoff', () => {
  const files = fixture('Fechamento final concluído em 2026-07-18.\n')
  const result = run(files)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).status, 'ok')
})
