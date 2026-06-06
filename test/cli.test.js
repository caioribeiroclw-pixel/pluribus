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

test('demo skill-use-rate validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'skill-use-rate'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: skill use-rate receipt/)
  assert.match(result.stdout, /skill use-rate receipt ok: 3 skills checked, 1 unused install warning/)
  assert.match(result.stdout, /installed is not used/)
})

test('demo skill-use-rate --json reports machine-readable summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'skill-use-rate', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'skill-use-rate')
  assert.deepEqual(payload.summary, { skillCount: 3, unusedInstallCount: 1 })
})


test('demo mcp-audit-receipt validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'mcp-audit-receipt'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: MCP audit receipt/)
  assert.match(result.stdout, /MCP audit receipt ok: 2 tool calls, 2 audit events, 2 metrics/)
  assert.match(result.stdout, /who invoked which tool, under which scope/)
})

test('demo mcp-audit-receipt --json reports machine-readable summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'mcp-audit-receipt', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'mcp-audit-receipt')
  assert.deepEqual(payload.summary, { toolCallCount: 2, auditEventCount: 2, metricCount: 2 })
})
