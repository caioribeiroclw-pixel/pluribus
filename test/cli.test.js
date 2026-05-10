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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-cli-'))
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

test('unknown command options fail before init writes files', () => {
  const dir = tempProject()

  const result = runCli(dir, ['init', '--dryrun', '--name', 'Ana'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Unknown option for `init`: --dryrun/)
  assert.match(result.stderr, /Supported options: .*--dry-run/)
  assert.equal(fs.existsSync(path.join(dir, 'pluribus.md')), false)
})

test('unknown command options fail before source-file checks', () => {
  const dir = tempProject()

  const result = runCli(dir, ['sync', '--ci'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Unknown option for `sync`: --ci/)
  assert.doesNotMatch(result.stderr, /pluribus\.md not found/)
})
