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


test('demo mcp-telemetry-import converts packaged JSONL into an audit receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'mcp-telemetry-import'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: MCP telemetry import/)
  assert.match(result.stdout, /4 JSONL entries → 2 audit receipt tool calls/)
  assert.match(result.stdout, /privacy-safe receipts/)
})

test('demo mcp-telemetry-import --json reports receipt and coverage gaps', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'mcp-telemetry-import', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'mcp-telemetry-import')
  assert.equal(payload.summary.parsedEntryCount, 4)
  assert.equal(payload.summary.toolCallCount, 2)
  assert.equal(payload.summary.matchedResponseCount, 2)
  assert.equal(payload.summary.missingGatewayLatency, false)
  assert.equal(payload.receipt.tool_calls[0].args_shape.query, 'string')
})


test('demo tool-surface-diff validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'tool-surface-diff'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: MCP tool-surface diff receipt/)
  assert.match(result.stdout, /3 discovered, 1 activated, 2 withheld\/blocked/)
  assert.match(result.stdout, /runtime MCP discovery changes the active tool surface/)
})

test('demo tool-surface-diff --json reports machine-readable summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'tool-surface-diff', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'tool-surface-diff')
  assert.deepEqual(payload.summary, { discoveredCount: 3, activatedCount: 1, withheldCount: 2 })
})

test('demo context-sufficiency-trace exposes the bundled failing trace', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'context-sufficiency-trace'])

  assert.equal(result.status, 1)
  assert.match(result.stdout, /Pluribus demo: context sufficiency trace/)
  assert.match(result.stdout, /context sufficiency fail: gold_context_recall=0.6667, missed_required_file_rate=0.3333, late_context_rate=0.3333/)
  assert.match(result.stdout, /frontier_cut_misses: src\/auth\/session.ts/)
})

test('demo context-sufficiency-trace --pass --json reports machine-readable pass summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'context-sufficiency-trace', '--pass', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'context-sufficiency-trace')
  assert.equal(payload.summary.verdict, 'pass')
  assert.equal(payload.summary.gold_context_recall, 1)
  assert.equal(payload.summary.missed_required_file_rate, 0)
})
