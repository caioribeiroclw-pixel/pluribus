import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = path.join(repoRoot, 'bin', 'pluribus.js')

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-init-'))
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

test('init --dry-run previews the scaffold without writing pluribus.md', () => {
  const dir = tempProject()

  const init = runCli(dir, [
    'init',
    '--dry-run',
    '--name',
    'Ana',
    '--description',
    'A Node.js service',
    '--tools',
    'claude,cursor',
  ])

  assert.equal(init.status, 0, init.stderr)
  assert.match(init.stdout, /# pluribus init --dry-run preview/)
  assert.match(init.stdout, /<!-- pluribus:tools: claude,cursor -->/)
  assert.match(init.stdout, /I am Ana, building \*\*A Node\.js service\*\*\./)
  assert.match(init.stdout, /Preview only — no files were written/)
  assert.equal(fs.existsSync(path.join(dir, 'pluribus.md')), false)
})

test('init --dry-run is safe when pluribus.md already exists', () => {
  const dir = tempProject()
  const sourcePath = path.join(dir, 'pluribus.md')
  fs.writeFileSync(sourcePath, '# Existing\n', 'utf8')

  const init = runCli(dir, ['init', '--dry-run', '--name', 'Preview'])

  assert.equal(init.status, 0, init.stderr)
  assert.match(init.stdout, /already exists\. This preview did not modify it/)
  assert.equal(fs.readFileSync(sourcePath, 'utf8'), '# Existing\n')
})
