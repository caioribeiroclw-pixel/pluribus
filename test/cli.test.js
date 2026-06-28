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


test('demo instruction-context-audit validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'instruction-context-audit'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: instruction-context audit receipt/)
  assert.match(result.stdout, /3 files, 1 skills, 4 warnings, decision=needs_review/)
  assert.match(result.stdout, /authority surfaces/)
})

test('demo instruction-context-audit --json reports machine-readable summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'instruction-context-audit', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'instruction-context-audit')
  assert.deepEqual(payload.summary, {
    fileCount: 3,
    skillCount: 1,
    warningCount: 4,
    decision: 'needs_review',
  })
})

test('demo style-rules-sync previews generated tool targets', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'style-rules-sync'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: style-rules sync/)
  assert.match(result.stdout, /generated 4 tool files from 5 canonical rules/)
  assert.match(result.stdout, /CLAUDE\.md/)
  assert.match(result.stdout, /AGENTS\.md/)
  assert.match(result.stdout, /copying a long style-rules file/)
})

test('demo style-rules-sync --json reports generated target hashes', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'style-rules-sync', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'style-rules-sync')
  assert.equal(payload.summary.tool_count, 4)
  assert.equal(payload.summary.generated_file_count, 4)
  assert.equal(payload.summary.canonical_rule_count, 5)
  assert.match(payload.summary.source_sha256, /^sha256:[a-f0-9]{64}$/)
  assert.equal(payload.summary.generated_files.some((file) => file.path === '.github/copilot-instructions.md'), true)
})

test('demo context-budget-receipt validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'context-budget-receipt'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: context-budget receipt/)
  assert.match(result.stdout, /context-budget receipt ok: 3 loaded sources, 2 suppressed, 1 duplicate, 4\/186 tool schemas loaded/)
  assert.match(result.stdout, /token-savings claims need evidence/)
})

test('demo context-budget-receipt --json reports budget summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'context-budget-receipt', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'context-budget-receipt')
  assert.equal(payload.summary.loadedSourceCount, 3)
  assert.equal(payload.summary.suppressedSourceCount, 2)
  assert.equal(payload.summary.duplicateSuppressionCount, 1)
  assert.equal(payload.summary.reloadedNextTurnCount, 2)
  assert.equal(payload.summary.availableToolSchemaCount, 186)
  assert.equal(payload.summary.loadedToolSchemaCount, 4)
  assert.equal(payload.summary.deferredToolSchemaCount, 182)
})

test('demo company-memory-export-test validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'company-memory-export-test'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: company-memory export test/)
  assert.match(result.stdout, /company-memory export receipt ok: 2 decisions, 2 constraints, 1 exceptions, 2 owners, 2 omitted gaps/)
  assert.match(result.stdout, /company memory becomes lock-in/)
})

test('demo company-memory-export-test --json reports export summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'company-memory-export-test', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'company-memory-export-test')
  assert.equal(payload.summary.decision, 'review_required')
  assert.equal(payload.summary.decisionCount, 2)
  assert.equal(payload.summary.constraintCount, 2)
  assert.equal(payload.summary.exceptionCount, 1)
  assert.equal(payload.summary.ownerCount, 2)
  assert.equal(payload.summary.sourceCount, 2)
  assert.equal(payload.summary.omittedGapCount, 2)
  assert.equal(payload.summary.staleSourceCount, 1)
})

test('demo shared-state-write-preflight validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'shared-state-write-preflight'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: shared-state write preflight/)
  assert.match(result.stdout, /shared-state write preflight ok: decision=allow, operation=record_update, 5 controls checked/)
  assert.match(result.stdout, /shared MCP databases let any connected agent write durable team state/)
})

test('demo shared-state-write-preflight --json reports write boundary summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'shared-state-write-preflight', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'shared-state-write-preflight')
  assert.equal(payload.summary.decision, 'allow')
  assert.equal(payload.summary.operation, 'record_update')
  assert.equal(payload.summary.collection, 'customer_tickets')
  assert.equal(payload.summary.controlCount, 5)
  assert.equal(payload.summary.rawRecordIncluded, false)
  assert.equal(payload.summary.omittedFieldCount, 2)
  assert.equal(payload.summary.sourceRefCount, 2)
  assert.equal(payload.summary.requiresHumanConfirmation, false)
})


test('demo mcp-action-boundary-preflight validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'mcp-action-boundary-preflight'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: MCP action-boundary preflight/)
  assert.match(result.stdout, /MCP action-boundary preflight ok: decision=block, intent=read, proposed_action=write, max_mutation_count=250/)
  assert.match(result.stdout, /turn a read request into account mutation/)
})

test('demo mcp-action-boundary-preflight --json reports permission boundary summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'mcp-action-boundary-preflight', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'mcp-action-boundary-preflight')
  assert.equal(payload.summary.decision, 'block')
  assert.equal(payload.summary.intentClass, 'read')
  assert.equal(payload.summary.proposedActionClass, 'write')
  assert.equal(payload.summary.writeToolCount, 2)
  assert.equal(payload.summary.maxMutationCount, 250)
  assert.equal(payload.summary.dryRun, true)
  assert.equal(payload.summary.requiresConfirmation, true)
  assert.equal(payload.summary.omittedFieldCount, 5)
})

test('demo cross-client-token-ledger validates the packaged receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'cross-client-token-ledger'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: cross-client token ledger/)
  assert.match(result.stdout, /cross-client token ledger ok: 2 clients compared, ratio=11\.62x, decision=investigate_bridge/)
  assert.match(result.stdout, /agent bridges can show the same visible prompt/)
})

test('demo cross-client-token-ledger --json reports bridge accounting summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'cross-client-token-ledger', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'cross-client-token-ledger')
  assert.equal(payload.summary.decision, 'investigate_bridge')
  assert.equal(payload.summary.clientCount, 2)
  assert.equal(payload.summary.baselineClient, 'cursor-native')
  assert.equal(payload.summary.variantClient, 'zed-through-cursor-acp')
  assert.equal(payload.summary.baselineTotalTokens, 18450)
  assert.equal(payload.summary.variantTotalTokens, 214300)
  assert.equal(payload.summary.totalTokenRatio, 11.62)
  assert.equal(payload.summary.variantFinalDiffLines, 42)
})

test('demo module-boundary-contract validates the packaged safe receipt', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'module-boundary-contract'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Pluribus demo: module boundary contract receipt/)
  assert.match(result.stdout, /module boundary receipt ok: 2 changed paths, 2 import prefixes, decision=accepted/)
  assert.match(result.stdout, /green verifier is not enough/)
})

test('demo module-boundary-contract --unsafe reports boundary violations', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'module-boundary-contract', '--unsafe'])

  assert.equal(result.status, 1)
  assert.match(result.stdout, /Pluribus demo: module boundary contract receipt/)
  assert.match(result.stderr, /changed path outside contract: src\/ui\/order-card.tsx/)
  assert.match(result.stderr, /forbidden import prefix used: src\/ui\//)
})

test('demo module-boundary-contract --json reports machine-readable summary', () => {
  const dir = tempProject()

  const result = runCli(dir, ['demo', 'module-boundary-contract', '--json'])

  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.demo, 'module-boundary-contract')
  assert.deepEqual(payload.summary, {
    contractId: 'api-module-v1',
    changedPathCount: 2,
    importPrefixCount: 2,
    decision: 'accepted',
  })
})
