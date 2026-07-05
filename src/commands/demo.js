/**
 * pluribus demo — run tiny packaged demos from npm without cloning the repo.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import { fileURLToPath } from 'url'
import { BUILT_IN_SKILLS } from '../skills/built-in.js'
import { parsePluribusFile } from '../utils/parser.js'
import { renderTemplate } from '../utils/renderer.js'

const DEFAULT_DEMO = 'skill-use-rate'
const SKILL_USE_RATE_DEMO = 'skill-use-rate'
const MCP_AUDIT_RECEIPT_DEMO = 'mcp-audit-receipt'
const MCP_TELEMETRY_IMPORT_DEMO = 'mcp-telemetry-import'
const MCP_TRAFFIC_RECEIPT_DEMO = 'mcp-traffic-receipt'
const TOOL_SURFACE_DIFF_DEMO = 'tool-surface-diff'
const CONTEXT_SUFFICIENCY_TRACE_DEMO = 'context-sufficiency-trace'
const MODULE_BOUNDARY_CONTRACT_DEMO = 'module-boundary-contract'
const INSTRUCTION_CONTEXT_AUDIT_DEMO = 'instruction-context-audit'
const STYLE_RULES_SYNC_DEMO = 'style-rules-sync'
const CONTEXT_BUDGET_RECEIPT_DEMO = 'context-budget-receipt'
const COMPANY_MEMORY_EXPORT_TEST_DEMO = 'company-memory-export-test'
const SHARED_STATE_WRITE_PREFLIGHT_DEMO = 'shared-state-write-preflight'
const CROSS_CLIENT_TOKEN_LEDGER_DEMO = 'cross-client-token-ledger'
const MCP_ACTION_BOUNDARY_PREFLIGHT_DEMO = 'mcp-action-boundary-preflight'
const AVAILABLE_DEMOS = [SKILL_USE_RATE_DEMO, MCP_AUDIT_RECEIPT_DEMO, MCP_TELEMETRY_IMPORT_DEMO, MCP_TRAFFIC_RECEIPT_DEMO, TOOL_SURFACE_DIFF_DEMO, CONTEXT_SUFFICIENCY_TRACE_DEMO, MODULE_BOUNDARY_CONTRACT_DEMO, INSTRUCTION_CONTEXT_AUDIT_DEMO, STYLE_RULES_SYNC_DEMO, CONTEXT_BUDGET_RECEIPT_DEMO, COMPANY_MEMORY_EXPORT_TEST_DEMO, SHARED_STATE_WRITE_PREFLIGHT_DEMO, CROSS_CLIENT_TOKEN_LEDGER_DEMO, MCP_ACTION_BOUNDARY_PREFLIGHT_DEMO]
const SKILL_USE_RATE_SCHEMA = 'pluribus.skill_use_rate_receipt.v1'
const MCP_AUDIT_RECEIPT_SCHEMA = 'pluribus.mcp_tool_call_audit_receipt.v1'
const MCP_TRAFFIC_RECEIPT_SCHEMA = 'pluribus.mcp_traffic_receipt.v1'
const TOOL_SURFACE_DIFF_SCHEMA = 'pluribus.mcp_tool_surface_diff_receipt.v1'
const MODULE_BOUNDARY_CONTRACT_SCHEMA = 'pluribus.module_boundary_contract.v1'
const INSTRUCTION_CONTEXT_AUDIT_SCHEMA = 'pluribus.instruction_context_audit.v1'
const CONTEXT_BUDGET_RECEIPT_SCHEMA = 'pluribus.context_budget_receipt.v1'
const COMPANY_MEMORY_EXPORT_RECEIPT_SCHEMA = 'pluribus.company_memory_export_receipt.v1'
const SHARED_STATE_WRITE_PREFLIGHT_SCHEMA = 'pluribus.shared_state_write_preflight.v1'
const CROSS_CLIENT_TOKEN_LEDGER_SCHEMA = 'pluribus.cross_client_token_ledger.v1'
const MCP_ACTION_BOUNDARY_PREFLIGHT_SCHEMA = 'pluribus.mcp_action_boundary_preflight.v1'

/**
 * @param {Record<string, string | boolean>} args
 * @param {string[]} positional
 */
export async function runDemo(args, positional = []) {
  const demoName = positional[0] || DEFAULT_DEMO

  switch (demoName) {
    case SKILL_USE_RATE_DEMO:
      return runSkillUseRateDemo(args)
    case MCP_AUDIT_RECEIPT_DEMO:
      return runMcpAuditReceiptDemo(args)
    case MCP_TELEMETRY_IMPORT_DEMO:
      return runMcpTelemetryImportDemo(args)
    case MCP_TRAFFIC_RECEIPT_DEMO:
      return runMcpTrafficReceiptDemo(args)
    case TOOL_SURFACE_DIFF_DEMO:
      return runToolSurfaceDiffDemo(args)
    case CONTEXT_SUFFICIENCY_TRACE_DEMO:
      return runContextSufficiencyTraceDemo(args)
    case MODULE_BOUNDARY_CONTRACT_DEMO:
      return runModuleBoundaryContractDemo(args)
    case INSTRUCTION_CONTEXT_AUDIT_DEMO:
      return runInstructionContextAuditDemo(args)
    case STYLE_RULES_SYNC_DEMO:
      return runStyleRulesSyncDemo(args)
    case CONTEXT_BUDGET_RECEIPT_DEMO:
      return runContextBudgetReceiptDemo(args)
    case COMPANY_MEMORY_EXPORT_TEST_DEMO:
      return runCompanyMemoryExportTestDemo(args)
    case SHARED_STATE_WRITE_PREFLIGHT_DEMO:
      return runSharedStateWritePreflightDemo(args)
    case CROSS_CLIENT_TOKEN_LEDGER_DEMO:
      return runCrossClientTokenLedgerDemo(args)
    case MCP_ACTION_BOUNDARY_PREFLIGHT_DEMO:
      return runMcpActionBoundaryPreflightDemo(args)
    default:
      console.error(`❌ Unknown demo: ${demoName}`)
      console.error(`   Available demos: ${AVAILABLE_DEMOS.join(', ')}`)
      process.exit(1)
  }
}

const STYLE_RULES_SYNC_SOURCE = `<!-- pluribus:tools: claude,cursor,openclaw,copilot -->

# Identity

I am a maintainer using one canonical style-rules file across agent coding tools.

# Stack

- Language: TypeScript
- Runtime: Node.js 22 LTS
- Package manager: npm

# Conventions

- Prefer small pure functions over hidden mutable state.
- Use async/await; never mix .then() chains into business logic.
- Keep domain logic out of CLI argument parsing.
- Write regression tests next to the behavior that failed.
- Update docs only when the behavior or user workflow changed.

# Goals

1. Keep Claude Code, Cursor, Copilot, and OpenClaw reading the same operating rules.
2. Avoid copy-pasting a 200-line rules file between projects and forgetting one target.
3. Make drift visible with generated-file headers that point back to pluribus.md.

# Constraints

- Never commit secrets, tokens, cookies, or private transcripts.
- Never run destructive shell commands without an explicit human approval path.
- Never treat generated tool files as the source of truth; edit pluribus.md instead.
`

function runStyleRulesSyncDemo(args) {
  const source = STYLE_RULES_SYNC_SOURCE
  const sections = parsePluribusFile(source)
  const tools = ['claude', 'cursor', 'openclaw', 'copilot']
  const generatedFiles = []

  for (const toolId of tools) {
    const skill = BUILT_IN_SKILLS[toolId]
    const rendered = renderTemplate(skill.template, sections, 'pluribus.md')
    for (const outputFile of skill.outputFiles) {
      generatedFiles.push({
        tool: toolId,
        path: outputFile,
        bytes: Buffer.byteLength(rendered, 'utf8'),
        sha256: `sha256:${createHash('sha256').update(rendered).digest('hex')}`,
      })
    }
  }

  const summary = {
    source: 'pluribus.md',
    source_sha256: `sha256:${createHash('sha256').update(source).digest('hex')}`,
    canonical_rule_count: 5,
    tool_count: tools.length,
    generated_file_count: generatedFiles.length,
    generated_files: generatedFiles,
  }

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: true,
      demo: STYLE_RULES_SYNC_DEMO,
      summary,
    }, null, 2))
    return
  }

  console.log('🧪 Pluribus demo: style-rules sync')
  console.log('   Source: one canonical pluribus.md style-rules file')
  console.log('')
  console.log(`✅ generated ${generatedFiles.length} tool files from ${summary.canonical_rule_count} canonical rules`)
  for (const file of generatedFiles) {
    console.log(`   • [${file.tool}] ${file.path} (${file.bytes} bytes, ${file.sha256.slice(0, 19)}…)`)
  }
  console.log('')
  console.log('Why this matters: copying a long style-rules file between projects and tools makes drift invisible. Keep the canonical rules in pluribus.md, generate each tool target, and audit the generated headers/digests when something diverges.')
  console.log('Try it locally: pluribus init --tools claude,cursor,openclaw,copilot && pluribus sync --dry-run')
}

function readReceipt(receiptPath, label) {
  try {
    return JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  } catch (err) {
    console.error(`❌ Could not read ${label} receipt at ${receiptPath}: ${err.message}`)
    process.exit(1)
  }
}

function selectedReceiptPath(args, defaultPath) {
  return typeof args.receipt === 'string' && args.receipt.trim()
    ? path.resolve(process.cwd(), args.receipt)
    : defaultPath
}

function runSkillUseRateDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledSkillUseRateReceiptPath())
  const receipt = readReceipt(receiptPath, 'skill use-rate')
  const result = validateSkillUseRateReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: SKILL_USE_RATE_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: skill use-rate receipt')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      const warningLabel = result.warnings.length === 1 ? 'warning' : 'warnings'
      console.log(`✅ skill use-rate receipt ok: ${result.summary.skillCount} skills checked, ${result.warnings.length} unused install ${warningLabel}`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: installed is not used. Track discovered → installed/attached → invoked → acted-on before paying context cost for dormant skills.')
      console.log('Try your own receipt: pluribus demo skill-use-rate --receipt path/to/skill-use-rate-receipt.json')
    } else {
      console.error('❌ skill use-rate receipt invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}

function selectedInputPath(args, defaultPath) {
  return typeof args.input === 'string' && args.input.trim()
    ? path.resolve(process.cwd(), args.input)
    : defaultPath
}

function runMcpAuditReceiptDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledMcpAuditReceiptPath())
  const receipt = readReceipt(receiptPath, 'MCP audit')
  const result = validateMcpAuditReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: MCP_AUDIT_RECEIPT_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: MCP audit receipt')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ MCP audit receipt ok: ${result.summary.toolCallCount} tool calls, ${result.summary.auditEventCount} audit events, ${result.summary.metricCount} metrics`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: production MCP needs audit events and low-cardinality metrics, not raw prompt/tool dumps. Prove who invoked which tool, under which scope, with redacted argument/result shape.')
      console.log('Try your own receipt: pluribus demo mcp-audit-receipt --receipt path/to/mcp-audit-receipt.json')
    } else {
      console.error('❌ MCP audit receipt invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}


function runMcpTelemetryImportDemo(args) {
  const inputPath = selectedInputPath(args, bundledMcpTelemetryJsonlPath())
  let logText
  try {
    logText = fs.readFileSync(inputPath, 'utf8')
  } catch (err) {
    console.error(`❌ Could not read MCP telemetry JSONL at ${inputPath}: ${err.message}`)
    process.exit(1)
  }

  const imported = importMcpTelemetryJsonl(logText)
  const result = validateMcpAuditReceipt(imported.receipt)
  const warnings = [...imported.warnings, ...result.warnings]

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: MCP_TELEMETRY_IMPORT_DEMO,
      input: path.relative(process.cwd(), inputPath) || inputPath,
      summary: {
        ...result.summary,
        parsedEntryCount: imported.summary.parsedEntryCount,
        matchedResponseCount: imported.summary.matchedResponseCount,
        missingGatewayLatency: imported.summary.missingGatewayLatency,
      },
      receipt: imported.receipt,
      warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: MCP telemetry import')
    console.log(`   Input: ${path.relative(process.cwd(), inputPath) || inputPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ MCP telemetry imported: ${imported.summary.parsedEntryCount} JSONL entries → ${result.summary.toolCallCount} audit receipt tool calls`)
      if (warnings.length > 0) for (const warning of warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: rpc-messages.jsonl is a useful fallback, but it usually proves tool-call attribution before it proves gateway latency. Convert raw JSON-RPC traces into privacy-safe receipts, then mark missing gateway evidence explicitly.')
      console.log('Try your own log: pluribus demo mcp-telemetry-import --input path/to/rpc-messages.jsonl --json')
    } else {
      console.error('❌ MCP telemetry import produced an invalid receipt:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}

function bundledSkillUseRateReceiptPath() {
  return fileURLToPath(new URL('../../examples/skill-use-rate-receipts/skill-use-rate-receipt.json', import.meta.url))
}

function bundledMcpAuditReceiptPath() {
  return fileURLToPath(new URL('../../examples/mcp-audit-receipts/mcp-audit-receipt.json', import.meta.url))
}

function bundledMcpTelemetryJsonlPath() {
  return fileURLToPath(new URL('../../examples/mcp-telemetry-import/sample-rpc-messages.jsonl', import.meta.url))
}

function bundledMcpTrafficReceiptPath() {
  return fileURLToPath(new URL('../../examples/mcp-traffic-receipts/mcp-traffic-receipt.json', import.meta.url))
}

function bundledToolSurfaceDiffReceiptPath() {
  return fileURLToPath(new URL('../../examples/tool-surface-diff-receipts/tool-surface-diff-receipt.json', import.meta.url))
}

function bundledContextSufficiencyGroundTruthPath() {
  return fileURLToPath(new URL('../../examples/context-sufficiency-trace/ground-truth.json', import.meta.url))
}

function bundledContextSufficiencyTracePath() {
  return fileURLToPath(new URL('../../examples/context-sufficiency-trace/context-trace.json', import.meta.url))
}

function bundledContextSufficiencyPassTracePath() {
  return fileURLToPath(new URL('../../examples/context-sufficiency-trace/context-trace-pass.json', import.meta.url))
}

function bundledModuleBoundaryContractPath() {
  return fileURLToPath(new URL('../../examples/module-boundary-contracts/module-contract.json', import.meta.url))
}

function bundledModuleBoundarySafeReceiptPath() {
  return fileURLToPath(new URL('../../examples/module-boundary-contracts/safe-edit-receipt.json', import.meta.url))
}

function bundledModuleBoundaryUnsafeReceiptPath() {
  return fileURLToPath(new URL('../../examples/module-boundary-contracts/unsafe-edit-receipt.json', import.meta.url))
}

function bundledInstructionContextAuditReceiptPath() {
  return fileURLToPath(new URL('../../examples/instruction-context-audit/instruction-context-audit-receipt.json', import.meta.url))
}

function bundledContextBudgetReceiptPath() {
  return fileURLToPath(new URL('../../examples/context-budget-receipts/context-budget-receipt.json', import.meta.url))
}

function bundledCompanyMemoryExportReceiptPath() {
  return fileURLToPath(new URL('../../examples/company-memory-export-test/company-memory-export-receipt.json', import.meta.url))
}

function bundledSharedStateWritePreflightReceiptPath() {
  return fileURLToPath(new URL('../../examples/shared-state-write-preflight/shared-state-write-preflight-receipt.json', import.meta.url))
}

function bundledCrossClientTokenLedgerReceiptPath() {
  return fileURLToPath(new URL('../../examples/cross-client-token-ledger/cross-client-token-ledger-receipt.json', import.meta.url))
}

function bundledMcpActionBoundaryPreflightReceiptPath() {
  return fileURLToPath(new URL('../../examples/mcp-action-boundary-preflight/mcp-action-boundary-preflight-receipt.json', import.meta.url))
}

function runMcpTrafficReceiptDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledMcpTrafficReceiptPath())
  const receipt = readReceipt(receiptPath, 'MCP traffic')
  const result = validateMcpTrafficReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: MCP_TRAFFIC_RECEIPT_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: MCP traffic receipt')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ MCP traffic receipt ok: ${result.summary.frameCount} frames, ${result.summary.toolCallCount} tool calls, ${result.summary.hungCallCount} hung, ${result.summary.replayableCallCount} replayable`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: MCP proxies can see real client↔server frames, but agents and reviewers need a redacted receipt that proves capability agreement, tool-call status, replay evidence, and privacy defaults without dumping raw payloads into context.')
      console.log('Try your own receipt: pluribus demo mcp-traffic-receipt --receipt path/to/mcp-traffic-receipt.json --json')
    } else {
      console.error('❌ MCP traffic receipt invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}

function runToolSurfaceDiffDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledToolSurfaceDiffReceiptPath())
  const receipt = readReceipt(receiptPath, 'tool-surface diff')
  const result = validateToolSurfaceDiffReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: TOOL_SURFACE_DIFF_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: MCP tool-surface diff receipt')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ tool-surface diff receipt ok: ${result.summary.discoveredCount} discovered, ${result.summary.activatedCount} activated, ${result.summary.withheldCount} withheld/blocked`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: runtime MCP discovery changes the active tool surface. Persist a low-cardinality receipt of discovered → activated → withheld/blocked tools without logging raw schemas, prompts, or results.')
      console.log('Try your own receipt: pluribus demo tool-surface-diff --receipt path/to/tool-surface-diff-receipt.json --json')
    } else {
      console.error('❌ tool-surface diff receipt invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}

function runContextSufficiencyTraceDemo(args) {
  const truthPath = typeof args.receipt === 'string' && args.receipt.trim()
    ? path.resolve(process.cwd(), args.receipt)
    : bundledContextSufficiencyGroundTruthPath()
  const tracePath = typeof args.input === 'string' && args.input.trim()
    ? path.resolve(process.cwd(), args.input)
    : (Boolean(args.pass) ? bundledContextSufficiencyPassTracePath() : bundledContextSufficiencyTracePath())

  const truth = readReceipt(truthPath, 'context sufficiency ground-truth')
  const trace = readReceipt(tracePath, 'context trace')
  const result = validateContextSufficiencyTrace(truth, trace)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.verdict === 'pass',
      demo: CONTEXT_SUFFICIENCY_TRACE_DEMO,
      groundTruth: path.relative(process.cwd(), truthPath) || truthPath,
      trace: path.relative(process.cwd(), tracePath) || tracePath,
      summary: result,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: context sufficiency trace')
    console.log(`   Ground truth: ${path.relative(process.cwd(), truthPath) || truthPath}`)
    console.log(`   Trace: ${path.relative(process.cwd(), tracePath) || tracePath}`)
    console.log('')

    const mark = result.verdict === 'pass' ? '✅' : '❌'
    console.log(`${mark} context sufficiency ${result.verdict}: gold_context_recall=${result.gold_context_recall}, missed_required_file_rate=${result.missed_required_file_rate}, late_context_rate=${result.late_context_rate}`)
    if (result.missed_required_files.length > 0) console.log(`   • missed_required_files: ${result.missed_required_files.join(', ')}`)
    if (result.frontier_cut_misses.length > 0) console.log(`   • frontier_cut_misses: ${result.frontier_cut_misses.join(', ')}`)
    console.log('')
    console.log('Why this matters: context compression is only safe if the reduced bundle still contains the files/symbols the task ground truth requires before editing starts.')
    console.log('Try your own trace: pluribus demo context-sufficiency-trace --receipt ground-truth.json --input context-trace.json --json')
  }

  if (result.verdict !== 'pass') process.exit(1)
}


function runInstructionContextAuditDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledInstructionContextAuditReceiptPath())
  const receipt = readReceipt(receiptPath, 'instruction-context audit')
  const result = validateInstructionContextAuditReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: INSTRUCTION_CONTEXT_AUDIT_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: instruction-context audit receipt')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ instruction-context audit ok: ${result.summary.fileCount} files, ${result.summary.skillCount} skills, ${result.summary.warningCount} warnings, decision=${result.summary.decision}`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: AGENTS.md, CLAUDE.md, Cursor rules, Copilot instructions, and Skills are authority surfaces. Hash what was active, mark dirty/stale/external sources, and gate writes before externally influenced context becomes command authority.')
      console.log('Try your own receipt: pluribus demo instruction-context-audit --receipt path/to/instruction-context-audit-receipt.json --json')
    } else {
      console.error('❌ instruction-context audit receipt invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}

function runModuleBoundaryContractDemo(args) {
  const contractPath = typeof args.input === 'string' && args.input.trim()
    ? path.resolve(process.cwd(), args.input)
    : bundledModuleBoundaryContractPath()
  const receiptPath = typeof args.receipt === 'string' && args.receipt.trim()
    ? path.resolve(process.cwd(), args.receipt)
    : (Boolean(args.unsafe) ? bundledModuleBoundaryUnsafeReceiptPath() : bundledModuleBoundarySafeReceiptPath())

  const contract = readReceipt(contractPath, 'module boundary contract')
  const receipt = readReceipt(receiptPath, 'module boundary')
  const result = validateModuleBoundaryContractReceipt(contract, receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: MODULE_BOUNDARY_CONTRACT_DEMO,
      contract: path.relative(process.cwd(), contractPath) || contractPath,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: module boundary contract receipt')
    console.log(`   Contract: ${path.relative(process.cwd(), contractPath) || contractPath}`)
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ module boundary receipt ok: ${result.summary.changedPathCount} changed paths, ${result.summary.importPrefixCount} import prefixes, decision=${result.summary.decision}`)
      console.log('')
      console.log('Why this matters: a green verifier is not enough when an agent silently widens module scope. Prove the contract was read, edits stayed inside allowed paths, imports stayed inside allowed prefixes, and the verifier ran after the last edit.')
      console.log('Try the failing fixture: pluribus demo module-boundary-contract --unsafe')
      console.log('Try your own receipt: pluribus demo module-boundary-contract --input module-contract.json --receipt edit-receipt.json --json')
    } else {
      console.error('❌ module boundary receipt invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}

function runContextBudgetReceiptDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledContextBudgetReceiptPath())
  const receipt = readReceipt(receiptPath, 'context-budget')
  const result = validateContextBudgetReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: CONTEXT_BUDGET_RECEIPT_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: context-budget receipt')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ context-budget receipt ok: ${result.summary.loadedSourceCount} loaded sources, ${result.summary.suppressedSourceCount} suppressed, ${result.summary.duplicateSuppressionCount} duplicate, ${result.summary.loadedToolSchemaCount}/${result.summary.availableToolSchemaCount} tool schemas loaded, decision=${result.summary.decision}`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: /clear, subagents, CLAUDE.md, memory, and Tool Search are useful, but token-savings claims need evidence. Prove what entered context, what was duplicated/suppressed/deferred, how old summaries were, and whether the next turn reloaded the right sources — without logging raw prompts, paths, memory, or schemas.')
      console.log('Try your own receipt: pluribus demo context-budget-receipt --receipt path/to/context-budget-receipt.json --json')
    } else {
      console.error('❌ context-budget receipt invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}



function runCrossClientTokenLedgerDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledCrossClientTokenLedgerReceiptPath())
  const receipt = readReceipt(receiptPath, 'cross-client token ledger')
  const result = validateCrossClientTokenLedgerReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: CROSS_CLIENT_TOKEN_LEDGER_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: cross-client token ledger')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ cross-client token ledger ok: ${result.summary.clientCount} clients compared, ratio=${result.summary.totalTokenRatio}x, decision=${result.summary.decision}`)
      console.log(`   • ${result.summary.baselineClient}: ${result.summary.baselineTotalTokens} total tokens`)
      console.log(`   • ${result.summary.variantClient}: ${result.summary.variantTotalTokens} total tokens`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: Cursor/Zed/ACP and other agent bridges can show the same visible prompt while sending different hidden context, tool schemas, file reads, and cacheable input. Compare clients with a small privacy-safe ledger before blaming the model, vendor, or user.')
      console.log('Try your own receipt: pluribus demo cross-client-token-ledger --receipt path/to/cross-client-token-ledger-receipt.json --json')
    } else {
      console.error('❌ cross-client token ledger invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}

function runSharedStateWritePreflightDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledSharedStateWritePreflightReceiptPath())
  const receipt = readReceipt(receiptPath, 'shared-state write preflight')
  const result = validateSharedStateWritePreflightReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: SHARED_STATE_WRITE_PREFLIGHT_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: shared-state write preflight')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ shared-state write preflight ok: decision=${result.summary.decision}, operation=${result.summary.operation}, ${result.summary.controlCount} controls checked, raw_record_included=${result.summary.rawRecordIncluded}`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: shared MCP databases let any connected agent write durable team state. Attribution after the fact is useful, but the safer boundary is a preflight that proves actor, collection, scope, policy decision, migration/trigger risk, concurrency, and omitted raw data before the write happens.')
      console.log('Try your own receipt: pluribus demo shared-state-write-preflight --receipt path/to/shared-state-write-preflight-receipt.json --json')
    } else {
      console.error('❌ shared-state write preflight invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}


function runMcpActionBoundaryPreflightDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledMcpActionBoundaryPreflightReceiptPath())
  const receipt = readReceipt(receiptPath, 'MCP action-boundary preflight')
  const result = validateMcpActionBoundaryPreflightReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: MCP_ACTION_BOUNDARY_PREFLIGHT_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: MCP action-boundary preflight')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ MCP action-boundary preflight ok: decision=${result.summary.decision}, intent=${result.summary.intentClass}, proposed_action=${result.summary.proposedActionClass}, max_mutation_count=${result.summary.maxMutationCount}`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: Gmail/Calendar/Drive/Slack MCP servers can turn a read request into account mutation when read and write tools share one auth surface. Preflight account, scopes, action class, max mutation, dry-run/confirm defaults, and revocation path before the first state-changing tool call.')
      console.log('Try your own receipt: pluribus demo mcp-action-boundary-preflight --receipt path/to/mcp-action-boundary-preflight.json --json')
    } else {
      console.error('❌ MCP action-boundary preflight invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}

function runCompanyMemoryExportTestDemo(args) {
  const receiptPath = selectedReceiptPath(args, bundledCompanyMemoryExportReceiptPath())
  const receipt = readReceipt(receiptPath, 'company-memory export')
  const result = validateCompanyMemoryExportReceipt(receipt)

  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: COMPANY_MEMORY_EXPORT_TEST_DEMO,
      receipt: path.relative(process.cwd(), receiptPath) || receiptPath,
      summary: result.summary,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2))
  } else {
    console.log('🧪 Pluribus demo: company-memory export test')
    console.log(`   Receipt: ${path.relative(process.cwd(), receiptPath) || receiptPath}`)
    console.log('')

    if (result.errors.length === 0) {
      console.log(`✅ company-memory export receipt ok: ${result.summary.decisionCount} decisions, ${result.summary.constraintCount} constraints, ${result.summary.exceptionCount} exceptions, ${result.summary.ownerCount} owners, ${result.summary.omittedGapCount} omitted gaps, decision=${result.summary.decision}`)
      for (const warning of result.warnings) console.log(`   • ${warning}`)
      console.log('')
      console.log('Why this matters: company memory becomes lock-in when another vendor/agent cannot resume from a neutral bundle. Prove exported decisions, active constraints, exceptions, owners, source freshness, and explicit “not exported” gaps without copying Slack history or hidden model memory.')
      console.log('Try your own receipt: pluribus demo company-memory-export-test --receipt path/to/company-memory-export-receipt.json --json')
    } else {
      console.error('❌ company-memory export receipt invalid:')
      for (const error of result.errors) console.error(`   • ${error}`)
    }
  }

  if (result.errors.length > 0) process.exit(1)
}





export function validateMcpActionBoundaryPreflightReceipt(receipt) {
  const errors = []
  const warnings = []
  const allowedDecisions = new Set(['allow', 'review_required', 'block'])
  const allowedActionClasses = new Set(['read', 'write', 'admin'])

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} must be a non-empty string`)
  }
  function requireBoolean(value, field) {
    if (typeof value !== 'boolean') errors.push(`${field} must be boolean`)
  }
  function requireArray(value, field) {
    if (!Array.isArray(value) || value.length === 0) errors.push(`${field} must be a non-empty array`)
  }
  function requireNonNegativeInteger(value, field) {
    if (!Number.isInteger(value) || value < 0) errors.push(`${field} must be a non-negative integer`)
  }

  if (receipt.schema !== MCP_ACTION_BOUNDARY_PREFLIGHT_SCHEMA) errors.push(`schema must be ${MCP_ACTION_BOUNDARY_PREFLIGHT_SCHEMA}`)
  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.user_intent?.summary, 'user_intent.summary')
  requireString(receipt.user_intent?.intent_class, 'user_intent.intent_class')
  requireString(receipt.user_intent?.requested_resource, 'user_intent.requested_resource')
  requireString(receipt.user_intent?.resource_account_hash, 'user_intent.resource_account_hash')
  requireString(receipt.tool_surface?.server, 'tool_surface.server')
  requireString(receipt.tool_surface?.server_config_hash, 'tool_surface.server_config_hash')
  requireArray(receipt.tool_surface?.granted_scopes, 'tool_surface.granted_scopes')
  requireArray(receipt.tool_surface?.available_tools, 'tool_surface.available_tools')
  requireString(receipt.proposed_action?.tool, 'proposed_action.tool')
  requireString(receipt.proposed_action?.action_class, 'proposed_action.action_class')
  requireString(receipt.proposed_action?.target_selector_hash, 'proposed_action.target_selector_hash')
  requireNonNegativeInteger(receipt.proposed_action?.max_mutation_count, 'proposed_action.max_mutation_count')
  requireBoolean(receipt.proposed_action?.dry_run, 'proposed_action.dry_run')
  requireBoolean(receipt.proposed_action?.requires_confirmation, 'proposed_action.requires_confirmation')
  requireString(receipt.proposed_action?.confirmation_prompt, 'proposed_action.confirmation_prompt')
  requireBoolean(receipt.boundary_controls?.intent_matches_action_class, 'boundary_controls.intent_matches_action_class')
  requireBoolean(receipt.boundary_controls?.read_write_split, 'boundary_controls.read_write_split')
  requireBoolean(receipt.boundary_controls?.default_dry_run, 'boundary_controls.default_dry_run')
  requireBoolean(receipt.boundary_controls?.explicit_confirmation_required, 'boundary_controls.explicit_confirmation_required')
  requireBoolean(receipt.boundary_controls?.revocation_path_documented, 'boundary_controls.revocation_path_documented')
  requireString(receipt.boundary_controls?.rollback_hint, 'boundary_controls.rollback_hint')
  requireBoolean(receipt.privacy?.raw_email_subjects_included, 'privacy.raw_email_subjects_included')
  requireBoolean(receipt.privacy?.raw_email_bodies_included, 'privacy.raw_email_bodies_included')
  requireBoolean(receipt.privacy?.oauth_tokens_included, 'privacy.oauth_tokens_included')
  requireArray(receipt.privacy?.omitted_fields, 'privacy.omitted_fields')
  requireString(receipt.decision, 'decision')

  if (!allowedActionClasses.has(receipt.user_intent?.intent_class)) errors.push('user_intent.intent_class must be read, write, or admin')
  if (!allowedActionClasses.has(receipt.proposed_action?.action_class)) errors.push('proposed_action.action_class must be read, write, or admin')
  if (!allowedDecisions.has(receipt.decision)) errors.push(`decision must be one of ${[...allowedDecisions].join('|')}`)
  if (!String(receipt.user_intent?.resource_account_hash || '').startsWith('sha256:')) errors.push('user_intent.resource_account_hash must be a sha256: hash')
  if (!String(receipt.tool_surface?.server_config_hash || '').startsWith('sha256:')) errors.push('tool_surface.server_config_hash must be a sha256: hash')
  if (!String(receipt.proposed_action?.target_selector_hash || '').startsWith('sha256:')) errors.push('proposed_action.target_selector_hash must be a sha256: hash')
  if (receipt.privacy?.raw_email_subjects_included !== false) errors.push('privacy.raw_email_subjects_included must be false')
  if (receipt.privacy?.raw_email_bodies_included !== false) errors.push('privacy.raw_email_bodies_included must be false')
  if (receipt.privacy?.oauth_tokens_included !== false) errors.push('privacy.oauth_tokens_included must be false')

  const tools = Array.isArray(receipt.tool_surface?.available_tools) ? receipt.tool_surface.available_tools : []
  const writeTools = tools.filter((tool) => tool.action_class === 'write' || tool.action_class === 'admin')
  for (const [index, tool] of tools.entries()) {
    const prefix = `tool_surface.available_tools[${index}]`
    requireString(tool.name, `${prefix}.name`)
    requireString(tool.action_class, `${prefix}.action_class`)
    if (!allowedActionClasses.has(tool.action_class)) errors.push(`${prefix}.action_class must be read, write, or admin`)
  }

  const intentClass = receipt.user_intent?.intent_class
  const actionClass = receipt.proposed_action?.action_class
  const actionMutates = actionClass === 'write' || actionClass === 'admin'
  const intentIsRead = intentClass === 'read'
  if (intentIsRead && actionMutates && receipt.boundary_controls?.intent_matches_action_class !== false) {
    errors.push('boundary_controls.intent_matches_action_class must be false when read intent proposes write/admin action')
  }
  if (intentIsRead && actionMutates && receipt.decision === 'allow') {
    errors.push('decision cannot be allow when a read intent proposes a write/admin action')
  }
  if (actionMutates && !receipt.proposed_action?.dry_run) warnings.push('state-changing proposed action is not dry-run')
  if (actionMutates && !receipt.proposed_action?.requires_confirmation) errors.push('state-changing proposed action must require confirmation')
  if (actionMutates && !receipt.boundary_controls?.revocation_path_documented) errors.push('state-changing proposed action must document revocation path')
  if (writeTools.length > 0 && receipt.boundary_controls?.read_write_split === false) warnings.push(`${writeTools.length} write/admin tools share this surface; prefer a read-only server for read intents`)
  if ((receipt.privacy?.omitted_fields || []).length === 0) warnings.push('no omitted fields recorded; preflight may not prove privacy negative space')

  return {
    errors,
    warnings,
    summary: {
      decision: receipt.decision || 'unknown',
      intentClass: intentClass || 'unknown',
      proposedActionClass: actionClass || 'unknown',
      server: receipt.tool_surface?.server || 'unknown',
      grantedScopeCount: Array.isArray(receipt.tool_surface?.granted_scopes) ? receipt.tool_surface.granted_scopes.length : 0,
      availableToolCount: tools.length,
      writeToolCount: writeTools.length,
      maxMutationCount: Number.isInteger(receipt.proposed_action?.max_mutation_count) ? receipt.proposed_action.max_mutation_count : 0,
      dryRun: receipt.proposed_action?.dry_run,
      requiresConfirmation: receipt.proposed_action?.requires_confirmation,
      omittedFieldCount: Array.isArray(receipt.privacy?.omitted_fields) ? receipt.privacy.omitted_fields.length : 0,
    },
  }
}

export function validateCrossClientTokenLedgerReceipt(receipt) {
  const errors = []
  const warnings = []
  const allowedDecisions = new Set(['ok', 'investigate_bridge', 'investigate_client', 'inconclusive'])

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} must be a non-empty string`)
  }
  function requireBoolean(value, field) {
    if (typeof value !== 'boolean') errors.push(`${field} must be boolean`)
  }
  function requireNumber(value, field) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) errors.push(`${field} must be a non-negative number`)
  }
  function requireArray(value, field) {
    if (!Array.isArray(value) || value.length === 0) errors.push(`${field} must be a non-empty array`)
  }

  if (receipt.schema !== CROSS_CLIENT_TOKEN_LEDGER_SCHEMA) errors.push(`schema must be ${CROSS_CLIENT_TOKEN_LEDGER_SCHEMA}`)
  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.comparison?.claim, 'comparison.claim')
  requireString(receipt.comparison?.baseline_client, 'comparison.baseline_client')
  requireString(receipt.comparison?.variant_client, 'comparison.variant_client')
  requireString(receipt.decision, 'decision')
  requireArray(receipt.runs, 'runs')
  if (!allowedDecisions.has(receipt.decision)) errors.push(`decision must be one of ${[...allowedDecisions].join('|')}`)

  const runs = Array.isArray(receipt.runs) ? receipt.runs : []
  const clients = new Set()
  for (const [index, run] of runs.entries()) {
    const prefix = `runs[${index}]`
    requireString(run.client, `${prefix}.client`)
    requireString(run.bridge, `${prefix}.bridge`)
    requireString(run.model, `${prefix}.model`)
    requireString(run.chat_state, `${prefix}.chat_state`)
    requireString(run.visible_prompt_hash, `${prefix}.visible_prompt_hash`)
    requireString(run.repo_fixture_hash, `${prefix}.repo_fixture_hash`)
    requireArray(run.auto_attached_files, `${prefix}.auto_attached_files`)
    requireNumber(run.tool_schemas?.exposed_count, `${prefix}.tool_schemas.exposed_count`)
    requireNumber(run.tool_schemas?.loaded_count, `${prefix}.tool_schemas.loaded_count`)
    requireNumber(run.tool_schemas?.token_estimate, `${prefix}.tool_schemas.token_estimate`)
    requireString(run.tool_schemas?.cache_status, `${prefix}.tool_schemas.cache_status`)
    requireNumber(run.input?.visible_prompt_tokens, `${prefix}.input.visible_prompt_tokens`)
    requireNumber(run.input?.hidden_context_tokens_estimate, `${prefix}.input.hidden_context_tokens_estimate`)
    requireNumber(run.input?.cacheable_input_tokens, `${prefix}.input.cacheable_input_tokens`)
    requireNumber(run.input?.uncached_input_tokens, `${prefix}.input.uncached_input_tokens`)
    requireNumber(run.activity?.tool_call_count, `${prefix}.activity.tool_call_count`)
    requireNumber(run.activity?.file_read_count, `${prefix}.activity.file_read_count`)
    requireNumber(run.activity?.changed_file_count, `${prefix}.activity.changed_file_count`)
    requireNumber(run.activity?.final_diff_lines, `${prefix}.activity.final_diff_lines`)
    requireNumber(run.usage?.input_tokens, `${prefix}.usage.input_tokens`)
    requireNumber(run.usage?.output_tokens, `${prefix}.usage.output_tokens`)
    requireNumber(run.usage?.total_tokens, `${prefix}.usage.total_tokens`)
    requireNumber(run.usage?.quota_percent, `${prefix}.usage.quota_percent`)
    requireBoolean(run.privacy?.raw_prompt_logged, `${prefix}.privacy.raw_prompt_logged`)
    requireBoolean(run.privacy?.raw_file_content_logged, `${prefix}.privacy.raw_file_content_logged`)
    requireArray(run.privacy?.omitted_fields, `${prefix}.privacy.omitted_fields`)

    if (run.client) clients.add(run.client)
    if (!String(run.visible_prompt_hash || '').startsWith('sha256:')) errors.push(`${prefix}.visible_prompt_hash must be a sha256: hash`)
    if (!String(run.repo_fixture_hash || '').startsWith('sha256:')) errors.push(`${prefix}.repo_fixture_hash must be a sha256: hash`)
    if (run.privacy?.raw_prompt_logged !== false) errors.push(`${prefix}.privacy.raw_prompt_logged must be false`)
    if (run.privacy?.raw_file_content_logged !== false) errors.push(`${prefix}.privacy.raw_file_content_logged must be false`)
    if ((run.privacy?.omitted_fields || []).length === 0) warnings.push(`${prefix} records no omitted fields; ledger may not prove privacy negative space`)
    if (run.tool_schemas?.loaded_count > run.tool_schemas?.exposed_count) errors.push(`${prefix}.tool_schemas.loaded_count cannot exceed exposed_count`)
    if (run.input?.hidden_context_tokens_estimate > run.input?.visible_prompt_tokens) warnings.push(`${run.client || prefix} hidden context exceeds visible prompt tokens`)
    if (run.tool_schemas?.cache_status === 'miss') warnings.push(`${run.client || prefix} tool/context cache missed`)
  }

  if (runs.length < 2) errors.push('runs must compare at least two clients')
  const baseline = runs.find((run) => run.client === receipt.comparison?.baseline_client) || runs[0]
  const variant = runs.find((run) => run.client === receipt.comparison?.variant_client) || runs[1]
  if (!runs.some((run) => run.client === receipt.comparison?.baseline_client)) errors.push('comparison.baseline_client must match a run.client')
  if (!runs.some((run) => run.client === receipt.comparison?.variant_client)) errors.push('comparison.variant_client must match a run.client')

  const baselineTotal = baseline?.usage?.total_tokens || 0
  const variantTotal = variant?.usage?.total_tokens || 0
  const ratio = baselineTotal > 0 ? Number((variantTotal / baselineTotal).toFixed(2)) : 0
  if (ratio >= 2) warnings.push(`variant uses ${ratio}x baseline total tokens; inspect hidden context, tool schemas, cache, and file reads before blaming the model`)
  if (receipt.decision === 'ok' && ratio >= 2) errors.push('decision cannot be ok when variant total tokens are >=2x baseline')

  return {
    errors,
    warnings,
    summary: {
      decision: receipt.decision || 'unknown',
      clientCount: clients.size,
      baselineClient: baseline?.client || 'unknown',
      variantClient: variant?.client || 'unknown',
      baselineTotalTokens: baselineTotal,
      variantTotalTokens: variantTotal,
      totalTokenRatio: ratio,
      variantHiddenContextTokens: variant?.input?.hidden_context_tokens_estimate || 0,
      variantToolSchemaTokens: variant?.tool_schemas?.token_estimate || 0,
      variantFileReadCount: variant?.activity?.file_read_count || 0,
      variantFinalDiffLines: variant?.activity?.final_diff_lines || 0,
    },
  }
}

export function validateSharedStateWritePreflightReceipt(receipt) {
  const errors = []
  const warnings = []
  const allowedDecisions = new Set(['allow', 'review_required', 'block'])
  const allowedOperations = new Set(['collection_create', 'record_create', 'record_update', 'schema_migration', 'trigger_create'])

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} must be a non-empty string`)
  }
  function requireBoolean(value, field) {
    if (typeof value !== 'boolean') errors.push(`${field} must be boolean`)
  }
  function requireArray(value, field) {
    if (!Array.isArray(value) || value.length === 0) errors.push(`${field} must be a non-empty array`)
  }

  if (receipt.schema !== SHARED_STATE_WRITE_PREFLIGHT_SCHEMA) errors.push(`schema must be ${SHARED_STATE_WRITE_PREFLIGHT_SCHEMA}`)
  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.store?.name, 'store.name')
  requireString(receipt.store?.workspace_hash, 'store.workspace_hash')
  requireString(receipt.store?.environment, 'store.environment')
  requireString(receipt.actor?.client, 'actor.client')
  requireString(receipt.actor?.agent_id_hash, 'actor.agent_id_hash')
  requireString(receipt.write_request?.operation, 'write_request.operation')
  requireString(receipt.write_request?.collection, 'write_request.collection')
  requireString(receipt.write_request?.reason, 'write_request.reason')
  requireString(receipt.authorization?.decision, 'authorization.decision')
  requireString(receipt.authorization?.policy_version, 'authorization.policy_version')
  requireArray(receipt.authorization?.allowed_collections, 'authorization.allowed_collections')
  requireString(receipt.authorization?.write_mode, 'authorization.write_mode')
  requireString(receipt.authorization?.idempotency_key, 'authorization.idempotency_key')
  requireBoolean(receipt.authorization?.requires_human_confirmation, 'authorization.requires_human_confirmation')
  requireBoolean(receipt.authorization?.concurrency_token_present, 'authorization.concurrency_token_present')
  requireString(receipt.risk_controls?.prompt_injection_scan, 'risk_controls.prompt_injection_scan')
  requireBoolean(receipt.risk_controls?.raw_prompt_logged, 'risk_controls.raw_prompt_logged')
  requireBoolean(receipt.risk_controls?.secrets_detected, 'risk_controls.secrets_detected')
  requireBoolean(receipt.risk_controls?.schema_migration_diff_present, 'risk_controls.schema_migration_diff_present')
  requireBoolean(receipt.risk_controls?.trigger_disabled_by_default, 'risk_controls.trigger_disabled_by_default')
  requireBoolean(receipt.data_boundary?.raw_record_included, 'data_boundary.raw_record_included')
  requireArray(receipt.data_boundary?.field_shape, 'data_boundary.field_shape')
  requireArray(receipt.data_boundary?.omitted_fields, 'data_boundary.omitted_fields')
  requireArray(receipt.provenance?.source_refs, 'provenance.source_refs')
  requireBoolean(receipt.expected_audit_event?.will_log, 'expected_audit_event.will_log')
  requireString(receipt.expected_audit_event?.causation_id, 'expected_audit_event.causation_id')
  requireString(receipt.expected_audit_event?.rollback_hint, 'expected_audit_event.rollback_hint')

  if (!allowedDecisions.has(receipt.authorization?.decision)) errors.push(`authorization.decision must be one of ${[...allowedDecisions].join('|')}`)
  if (!allowedOperations.has(receipt.write_request?.operation)) errors.push(`write_request.operation must be one of ${[...allowedOperations].join('|')}`)
  if (!['read_only', 'read_write', 'append_only'].includes(receipt.authorization?.write_mode)) errors.push('authorization.write_mode must be read_only, read_write, or append_only')
  if (receipt.data_boundary?.raw_record_included !== false) errors.push('data_boundary.raw_record_included must be false')
  if (receipt.risk_controls?.raw_prompt_logged !== false) errors.push('risk_controls.raw_prompt_logged must be false')
  if (receipt.risk_controls?.secrets_detected !== false) errors.push('risk_controls.secrets_detected must be false')
  if (receipt.expected_audit_event?.will_log !== true) errors.push('expected_audit_event.will_log must be true')
  if (!String(receipt.store?.workspace_hash || '').startsWith('sha256:')) errors.push('store.workspace_hash must be a sha256: hash')
  if (!String(receipt.actor?.agent_id_hash || '').startsWith('sha256:')) errors.push('actor.agent_id_hash must be a sha256: hash')

  if (!receipt.authorization?.allowed_collections?.includes(receipt.write_request?.collection)) {
    errors.push('authorization.allowed_collections must include write_request.collection')
  }
  if (receipt.authorization?.decision === 'allow' && receipt.authorization?.requires_human_confirmation) {
    warnings.push('decision is allow but requires_human_confirmation is true; caller should pause for human approval')
  }
  if (['schema_migration', 'trigger_create'].includes(receipt.write_request?.operation) && !receipt.authorization?.requires_human_confirmation) {
    errors.push('schema migrations and trigger creation must require human confirmation')
  }
  if (receipt.write_request?.operation === 'schema_migration' && receipt.risk_controls?.schema_migration_diff_present !== true) {
    errors.push('schema_migration requires risk_controls.schema_migration_diff_present=true')
  }
  if (receipt.write_request?.operation === 'trigger_create' && receipt.risk_controls?.trigger_disabled_by_default !== true) {
    errors.push('trigger_create requires risk_controls.trigger_disabled_by_default=true')
  }
  if (!receipt.authorization?.concurrency_token_present) warnings.push('no concurrency token present; concurrent agent writes may race')
  if ((receipt.data_boundary?.omitted_fields || []).length === 0) warnings.push('no omitted fields recorded; preflight may not prove privacy negative space')

  return {
    errors,
    warnings,
    summary: {
      decision: receipt.authorization?.decision || 'unknown',
      operation: receipt.write_request?.operation || 'unknown',
      collection: receipt.write_request?.collection || 'unknown',
      controlCount: ['prompt_injection_scan', 'raw_prompt_logged', 'secrets_detected', 'schema_migration_diff_present', 'trigger_disabled_by_default'].filter((key) => Object.prototype.hasOwnProperty.call(receipt.risk_controls || {}, key)).length,
      rawRecordIncluded: receipt.data_boundary?.raw_record_included,
      omittedFieldCount: Array.isArray(receipt.data_boundary?.omitted_fields) ? receipt.data_boundary.omitted_fields.length : 0,
      sourceRefCount: Array.isArray(receipt.provenance?.source_refs) ? receipt.provenance.source_refs.length : 0,
      requiresHumanConfirmation: receipt.authorization?.requires_human_confirmation,
    },
  }
}

export function validateCompanyMemoryExportReceipt(receipt) {
  const errors = []
  const warnings = []
  const allowedDecisions = new Set(['portable', 'review_required', 'not_portable'])

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} must be a non-empty string`)
  }
  function requireBoolean(value, field) {
    if (typeof value !== 'boolean') errors.push(`${field} must be boolean`)
  }
  function requireArray(value, field) {
    if (!Array.isArray(value) || value.length === 0) errors.push(`${field} must be a non-empty array`)
  }

  if (receipt.schema !== COMPANY_MEMORY_EXPORT_RECEIPT_SCHEMA) errors.push(`schema must be ${COMPANY_MEMORY_EXPORT_RECEIPT_SCHEMA}`)
  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.export_test?.question, 'export_test.question')
  requireString(receipt.export_test?.decision, 'export_test.decision')
  requireString(receipt.source_system?.name, 'source_system.name')
  requireString(receipt.source_system?.vendor, 'source_system.vendor')
  requireString(receipt.target_agent?.name, 'target_agent.name')
  requireString(receipt.target_agent?.vendor, 'target_agent.vendor')
  requireBoolean(receipt.privacy_boundary?.raw_chat_history_included, 'privacy_boundary.raw_chat_history_included')
  requireBoolean(receipt.privacy_boundary?.hidden_model_memory_required, 'privacy_boundary.hidden_model_memory_required')
  requireString(receipt.privacy_boundary?.hash_policy, 'privacy_boundary.hash_policy')
  requireArray(receipt.decisions, 'decisions')
  requireArray(receipt.active_constraints, 'active_constraints')
  requireArray(receipt.exceptions, 'exceptions')
  requireArray(receipt.owners, 'owners')
  requireArray(receipt.sources, 'sources')
  requireArray(receipt.omitted_gaps, 'omitted_gaps')

  if (!allowedDecisions.has(receipt.export_test?.decision)) {
    errors.push(`export_test.decision must be one of ${[...allowedDecisions].join('|')}`)
  }
  if (receipt.privacy_boundary?.raw_chat_history_included !== false) {
    errors.push('privacy_boundary.raw_chat_history_included must be false')
  }
  if (receipt.privacy_boundary?.hidden_model_memory_required !== false) {
    errors.push('privacy_boundary.hidden_model_memory_required must be false')
  }
  if (!['hashes_and_summaries_only', 'hashes_only'].includes(receipt.privacy_boundary?.hash_policy)) {
    errors.push('privacy_boundary.hash_policy must be hashes_and_summaries_only or hashes_only')
  }

  for (const [index, decision] of (receipt.decisions || []).entries()) {
    const prefix = `decisions[${index}]`
    requireString(decision.id, `${prefix}.id`)
    requireString(decision.summary, `${prefix}.summary`)
    requireString(decision.status, `${prefix}.status`)
    requireString(decision.source_hash, `${prefix}.source_hash`)
    if (!String(decision.source_hash || '').startsWith('sha256:')) errors.push(`${prefix}.source_hash must be sha256: hash`)
  }
  for (const [index, constraint] of (receipt.active_constraints || []).entries()) {
    const prefix = `active_constraints[${index}]`
    requireString(constraint.id, `${prefix}.id`)
    requireString(constraint.summary, `${prefix}.summary`)
    requireString(constraint.owner_id, `${prefix}.owner_id`)
    requireString(constraint.source_hash, `${prefix}.source_hash`)
  }
  for (const [index, exception] of (receipt.exceptions || []).entries()) {
    const prefix = `exceptions[${index}]`
    requireString(exception.id, `${prefix}.id`)
    requireString(exception.summary, `${prefix}.summary`)
    requireString(exception.expires_at, `${prefix}.expires_at`)
  }
  for (const [index, owner] of (receipt.owners || []).entries()) {
    const prefix = `owners[${index}]`
    requireString(owner.id, `${prefix}.id`)
    requireString(owner.role, `${prefix}.role`)
    requireString(owner.contact_ref, `${prefix}.contact_ref`)
  }
  for (const [index, source] of (receipt.sources || []).entries()) {
    const prefix = `sources[${index}]`
    requireString(source.id, `${prefix}.id`)
    requireString(source.kind, `${prefix}.kind`)
    requireString(source.last_seen_at, `${prefix}.last_seen_at`)
    requireString(source.freshness, `${prefix}.freshness`)
    if (!['fresh', 'stale', 'unknown'].includes(source.freshness)) errors.push(`${prefix}.freshness must be fresh|stale|unknown`)
  }
  for (const [index, gap] of (receipt.omitted_gaps || []).entries()) {
    const prefix = `omitted_gaps[${index}]`
    requireString(gap.kind, `${prefix}.kind`)
    requireString(gap.reason, `${prefix}.reason`)
    requireString(gap.resume_instruction, `${prefix}.resume_instruction`)
  }

  const staleSourceCount = (receipt.sources || []).filter((source) => source.freshness === 'stale' || source.freshness === 'unknown').length
  if (staleSourceCount > 0) warnings.push(`${staleSourceCount} source freshness value is stale or unknown; target agent should review before acting`)
  if ((receipt.omitted_gaps || []).length === 0) warnings.push('no omitted gaps recorded; export test may be hiding negative space')

  return {
    errors,
    warnings,
    summary: {
      decision: receipt.export_test?.decision || 'unknown',
      decisionCount: Array.isArray(receipt.decisions) ? receipt.decisions.length : 0,
      constraintCount: Array.isArray(receipt.active_constraints) ? receipt.active_constraints.length : 0,
      exceptionCount: Array.isArray(receipt.exceptions) ? receipt.exceptions.length : 0,
      ownerCount: Array.isArray(receipt.owners) ? receipt.owners.length : 0,
      sourceCount: Array.isArray(receipt.sources) ? receipt.sources.length : 0,
      omittedGapCount: Array.isArray(receipt.omitted_gaps) ? receipt.omitted_gaps.length : 0,
      staleSourceCount,
    },
  }
}


export function validateContextBudgetReceipt(receipt) {
  const errors = []
  const warnings = []
  const allowedDecisions = new Set(['allow', 'review_context_plan', 'block'])

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} must be a non-empty string`)
  }
  function requireBoolean(value, field) {
    if (typeof value !== 'boolean') errors.push(`${field} must be boolean`)
  }
  function requireNonNegativeInteger(value, field) {
    if (!Number.isInteger(value) || value < 0) errors.push(`${field} must be a non-negative integer`)
  }

  if (receipt.schema !== CONTEXT_BUDGET_RECEIPT_SCHEMA) errors.push(`schema must be ${CONTEXT_BUDGET_RECEIPT_SCHEMA}`)
  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.agent?.name, 'agent.name')
  requireString(receipt.agent?.session_id_hash, 'agent.session_id_hash')
  requireString(receipt.agent?.turn_id_hash, 'agent.turn_id_hash')
  requireString(receipt.question, 'question')
  requireString(receipt.context_window?.model_window_bucket, 'context_window.model_window_bucket')
  requireString(receipt.context_window?.startup_token_bucket, 'context_window.startup_token_bucket')
  requireString(receipt.context_window?.remaining_token_bucket, 'context_window.remaining_token_bucket')

  const loadedSources = Array.isArray(receipt.loaded_sources) ? receipt.loaded_sources : []
  const suppressedSources = Array.isArray(receipt.suppressed_sources) ? receipt.suppressed_sources : []
  if (loadedSources.length === 0) errors.push('loaded_sources must include at least one source')

  let reloadedCount = 0
  for (const [index, source] of loadedSources.entries()) {
    const prefix = `loaded_sources[${index}]`
    requireString(source.kind, `${prefix}.kind`)
    requireString(source.role, `${prefix}.role`)
    requireString(source.source_hash, `${prefix}.source_hash`)
    requireString(source.token_bucket, `${prefix}.token_bucket`)
    requireBoolean(source.reloaded_next_turn, `${prefix}.reloaded_next_turn`)
    if (!String(source.source_hash || '').startsWith('sha256:')) errors.push(`${prefix}.source_hash must be a sha256: hash, not raw source text or path`)
    if (source.reloaded_next_turn === true) reloadedCount++
  }

  let duplicateSuppressionCount = 0
  for (const [index, source] of suppressedSources.entries()) {
    const prefix = `suppressed_sources[${index}]`
    requireString(source.kind, `${prefix}.kind`)
    requireString(source.reason, `${prefix}.reason`)
    requireString(source.source_hash, `${prefix}.source_hash`)
    requireString(source.token_bucket, `${prefix}.token_bucket`)
    if (!String(source.source_hash || '').startsWith('sha256:')) errors.push(`${prefix}.source_hash must be a sha256: hash`)
    if (source.reason === 'duplicate_of_loaded_rule') {
      duplicateSuppressionCount++
      requireString(source.duplicate_of_hash, `${prefix}.duplicate_of_hash`)
    }
  }

  requireNonNegativeInteger(receipt.tool_schema_budget?.available_count, 'tool_schema_budget.available_count')
  requireNonNegativeInteger(receipt.tool_schema_budget?.loaded_count, 'tool_schema_budget.loaded_count')
  requireNonNegativeInteger(receipt.tool_schema_budget?.deferred_count, 'tool_schema_budget.deferred_count')
  requireString(receipt.tool_schema_budget?.loaded_token_bucket, 'tool_schema_budget.loaded_token_bucket')
  requireString(receipt.tool_schema_budget?.deferred_token_bucket, 'tool_schema_budget.deferred_token_bucket')
  if (Number.isInteger(receipt.tool_schema_budget?.available_count) && Number.isInteger(receipt.tool_schema_budget?.loaded_count) && Number.isInteger(receipt.tool_schema_budget?.deferred_count)) {
    if (receipt.tool_schema_budget.loaded_count + receipt.tool_schema_budget.deferred_count !== receipt.tool_schema_budget.available_count) {
      errors.push('tool_schema_budget.loaded_count + deferred_count must equal available_count')
    }
  }

  if (receipt.privacy?.raw_prompt_included !== false) errors.push('privacy.raw_prompt_included must be false')
  if (receipt.privacy?.raw_file_paths_included !== false) errors.push('privacy.raw_file_paths_included must be false')
  if (receipt.privacy?.raw_file_contents_included !== false) errors.push('privacy.raw_file_contents_included must be false')
  if (receipt.privacy?.raw_tool_schemas_included !== false) errors.push('privacy.raw_tool_schemas_included must be false')
  if (receipt.privacy?.raw_memory_text_included !== false) errors.push('privacy.raw_memory_text_included must be false')
  if (!allowedDecisions.has(receipt.decision)) errors.push('decision must be allow, review_context_plan, or block')
  if (reloadedCount === 0) warnings.push('no loaded source was marked reloaded_next_turn=true; receipt cannot prove continuity after compaction/clear')
  if (suppressedSources.length === 0) warnings.push('no suppressed sources recorded; receipt may not prove duplicate/deferred negative space')

  return {
    errors,
    warnings,
    summary: {
      loadedSourceCount: loadedSources.length,
      suppressedSourceCount: suppressedSources.length,
      duplicateSuppressionCount,
      reloadedNextTurnCount: reloadedCount,
      availableToolSchemaCount: Number.isInteger(receipt.tool_schema_budget?.available_count) ? receipt.tool_schema_budget.available_count : 0,
      loadedToolSchemaCount: Number.isInteger(receipt.tool_schema_budget?.loaded_count) ? receipt.tool_schema_budget.loaded_count : 0,
      deferredToolSchemaCount: Number.isInteger(receipt.tool_schema_budget?.deferred_count) ? receipt.tool_schema_budget.deferred_count : 0,
      decision: receipt.decision || 'unknown',
    },
  }
}


export function validateInstructionContextAuditReceipt(receipt) {
  const errors = []
  const warnings = []
  const allowedStatuses = new Set(['captured', 'missing', 'ignored', 'unreadable'])
  const allowedReviewStates = new Set(['reviewed', 'unreviewed', 'external', 'generated'])
  const allowedDecisions = new Set(['allow', 'needs_review', 'block'])

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} must be a non-empty string`)
  }

  if (receipt.schema !== INSTRUCTION_CONTEXT_AUDIT_SCHEMA) errors.push(`schema must be ${INSTRUCTION_CONTEXT_AUDIT_SCHEMA}`)
  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.session_id_hash, 'session_id_hash')
  if (!allowedDecisions.has(receipt.decision)) errors.push('decision must be allow, needs_review, or block')
  if (receipt.privacy?.raw_instruction_text_included !== false) errors.push('privacy.raw_instruction_text_included must be false')
  if (receipt.privacy?.raw_prompts_included !== false) errors.push('privacy.raw_prompts_included must be false')

  const files = Array.isArray(receipt.instruction_files) ? receipt.instruction_files : []
  const skills = Array.isArray(receipt.skills) ? receipt.skills : []
  if (files.length === 0 && skills.length === 0) errors.push('receipt must include at least one instruction file or skill')

  for (const [index, file] of files.entries()) {
    const prefix = `instruction_files[${index}]`
    requireString(file.path, `${prefix}.path`)
    if (!allowedStatuses.has(file.status)) errors.push(`${prefix}.status must be captured, missing, ignored, or unreadable`)
    if (file.status === 'captured') {
      requireString(file.sha256, `${prefix}.sha256`)
      if (!Number.isInteger(file.bytes) || file.bytes < 0) errors.push(`${prefix}.bytes must be a non-negative integer`)
    }
    if (!allowedReviewStates.has(file.review_state)) errors.push(`${prefix}.review_state must be reviewed, unreviewed, external, or generated`)
    if (file.review_state === 'external') warnings.push(`${file.path || prefix} is externally influenced; gate command authority before acting on it`)
    if (file.review_state === 'unreviewed') warnings.push(`${file.path || prefix} was active but unreviewed`)
    if (file.stale === true) warnings.push(`${file.path || prefix} is marked stale`)
  }

  for (const [index, skill] of skills.entries()) {
    const prefix = `skills[${index}]`
    requireString(skill.name, `${prefix}.name`)
    requireString(skill.source_ref, `${prefix}.source_ref`)
    requireString(skill.metadata_sha256, `${prefix}.metadata_sha256`)
    if (!allowedReviewStates.has(skill.review_state)) errors.push(`${prefix}.review_state must be reviewed, unreviewed, external, or generated`)
    if (skill.loaded !== true && skill.loaded !== false) errors.push(`${prefix}.loaded must be boolean`)
    if (skill.loaded && skill.review_state !== 'reviewed') warnings.push(`${skill.name || prefix} was loaded without reviewed metadata`)
  }

  if (receipt.git?.dirty === true) warnings.push('git working tree was dirty when instruction context was captured')
  if (receipt.decision === 'allow' && warnings.length > 0) errors.push('decision cannot be allow while warnings are present')

  return {
    errors,
    warnings,
    summary: {
      fileCount: files.length,
      skillCount: skills.length,
      warningCount: warnings.length,
      decision: receipt.decision || 'unknown',
    },
  }
}

export function validateModuleBoundaryContractReceipt(contract, receipt) {
  const errors = []
  const startsWithAny = (value, prefixes) => prefixes.some((prefix) => typeof value === 'string' && value.startsWith(prefix))
  const contractId = contract.contract_id
  const editPathPrefixes = Array.isArray(contract.edit_path_prefixes) ? contract.edit_path_prefixes : []
  const allowedImportPrefixes = Array.isArray(contract.allowed_import_prefixes) ? contract.allowed_import_prefixes : []
  const forbiddenImportPrefixes = Array.isArray(contract.forbidden_import_prefixes) ? contract.forbidden_import_prefixes : []

  if (typeof contractId !== 'string' || contractId.trim() === '') errors.push('contract.contract_id must be a non-empty string')
  if (editPathPrefixes.length === 0) errors.push('contract.edit_path_prefixes must be a non-empty array')
  if (allowedImportPrefixes.length === 0) errors.push('contract.allowed_import_prefixes must be a non-empty array')
  if (typeof contract.minimum_verifier !== 'string' || contract.minimum_verifier.trim() === '') errors.push('contract.minimum_verifier must be a non-empty string')

  if (receipt.receipt_type !== MODULE_BOUNDARY_CONTRACT_SCHEMA) errors.push(`receipt_type must be ${MODULE_BOUNDARY_CONTRACT_SCHEMA}`)
  if (receipt.contract_id !== contractId) errors.push(`contract_id mismatch: expected ${contractId}`)
  if (receipt.agent_read_contract !== true) errors.push('agent_read_contract must be true before edits are accepted')

  for (const changedPath of receipt.changed_paths ?? []) {
    if (!startsWithAny(changedPath, editPathPrefixes)) errors.push(`changed path outside contract: ${changedPath}`)
  }
  for (const prefix of receipt.import_prefixes_used ?? []) {
    if (startsWithAny(prefix, forbiddenImportPrefixes)) errors.push(`forbidden import prefix used: ${prefix}`)
    if (!startsWithAny(prefix, allowedImportPrefixes)) errors.push(`import prefix not listed as allowed: ${prefix}`)
  }
  if (receipt.verifier?.command !== contract.minimum_verifier) errors.push(`verifier command mismatch: expected ${contract.minimum_verifier}`)
  if (receipt.verifier?.exit_code !== 0 || receipt.verifier?.completed_after_last_edit !== true) errors.push('verifier must pass after the last edit')
  if (receipt.privacy?.raw_source_included !== false) errors.push('privacy.raw_source_included must be false')
  if (receipt.privacy?.raw_prompt_included !== false) errors.push('privacy.raw_prompt_included must be false')
  if (receipt.decision === 'accepted' && errors.length > 0) errors.push('decision cannot be accepted while boundary checks fail')

  return {
    errors,
    summary: {
      contractId,
      changedPathCount: Array.isArray(receipt.changed_paths) ? receipt.changed_paths.length : 0,
      importPrefixCount: Array.isArray(receipt.import_prefixes_used) ? receipt.import_prefixes_used.length : 0,
      decision: receipt.decision || 'unknown',
    },
  }
}

export function validateContextSufficiencyTrace(truth, trace) {
  const required = new Set(Array.isArray(truth.required_files) ? truth.required_files : [])
  const returned = new Set((Array.isArray(trace.returned_files) ? trace.returned_files : []).map((file) => file.path).filter(Boolean))
  const frontierCut = new Set((Array.isArray(trace.frontier_cut) ? trace.frontier_cut : []).map((file) => file.path).filter(Boolean))
  const late = new Set((Array.isArray(trace.late_files) ? trace.late_files : []).map((file) => file.path).filter(Boolean))

  const requiredList = [...required]
  const returnedRequired = requiredList.filter((filePath) => returned.has(filePath))
  const missedRequired = requiredList.filter((filePath) => !returned.has(filePath))
  const frontierCutMisses = missedRequired.filter((filePath) => frontierCut.has(filePath))
  const lateMisses = missedRequired.filter((filePath) => late.has(filePath))

  const ratio = (count, total) => (total === 0 ? 0 : Number((count / total).toFixed(4)))
  return {
    task_id: truth.task_id || 'unknown-task',
    trace_id: trace.trace_id || 'unknown-trace',
    required_files: requiredList.length,
    returned_files: returned.size,
    gold_context_recall: ratio(returnedRequired.length, requiredList.length),
    missed_required_file_rate: ratio(missedRequired.length, requiredList.length),
    late_context_rate: ratio(lateMisses.length, requiredList.length),
    missed_required_files: missedRequired,
    frontier_cut_misses: frontierCutMisses,
    verdict: missedRequired.length === 0 ? 'pass' : 'fail',
  }
}

export function validateSkillUseRateReceipt(receipt) {
  const errors = []
  const warnings = []

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${field} must be a non-empty string`)
    }
  }

  function requireBoolean(value, field) {
    if (typeof value !== 'boolean') {
      errors.push(`${field} must be boolean`)
    }
  }

  function requireNonNegativeInteger(value, field) {
    if (!Number.isInteger(value) || value < 0) {
      errors.push(`${field} must be a non-negative integer`)
    }
  }

  if (receipt.schema !== SKILL_USE_RATE_SCHEMA) {
    errors.push(`schema must be ${SKILL_USE_RATE_SCHEMA}`)
  }

  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.installer?.name, 'installer.name')
  requireString(receipt.window?.started_at, 'window.started_at')
  requireString(receipt.window?.ended_at, 'window.ended_at')

  if (!Array.isArray(receipt.skills) || receipt.skills.length === 0) {
    errors.push('skills must be a non-empty array')
  }

  for (const [index, skill] of (receipt.skills || []).entries()) {
    const prefix = `skills[${index}]`
    requireString(skill.skill_id, `${prefix}.skill_id`)
    requireString(skill.source_ref, `${prefix}.source_ref`)
    requireString(skill.target_agent, `${prefix}.target_agent`)
    requireString(skill.scope, `${prefix}.scope`)
    requireString(skill.install_method, `${prefix}.install_method`)
    requireBoolean(skill.discovered, `${prefix}.discovered`)
    requireBoolean(skill.installed, `${prefix}.installed`)
    requireBoolean(skill.attached, `${prefix}.attached`)
    requireBoolean(skill.unused_since_install, `${prefix}.unused_since_install`)
    requireNonNegativeInteger(skill.invoked_count, `${prefix}.invoked_count`)
    requireNonNegativeInteger(skill.acted_on_count, `${prefix}.acted_on_count`)

    if (Number.isInteger(skill.acted_on_count) && Number.isInteger(skill.invoked_count) && skill.acted_on_count > skill.invoked_count) {
      errors.push(`${prefix}.acted_on_count cannot exceed invoked_count`)
    }

    if (skill.installed && skill.attached && skill.invoked_count === 0) {
      if (skill.unused_since_install !== true) {
        errors.push(`${prefix}.unused_since_install must be true when installed/attached but never invoked`)
      }
      warnings.push(`${skill.skill_id || prefix} is installed/attached but has 0 invocations in this window`)
    }

    if (skill.invoked_count > 0) {
      if (skill.unused_since_install !== false) {
        errors.push(`${prefix}.unused_since_install must be false when invoked_count > 0`)
      }
      if (typeof skill.last_invoked_at !== 'string' || skill.last_invoked_at.trim() === '') {
        errors.push(`${prefix}.last_invoked_at must be set when invoked_count > 0`)
      }
    }

    if (!Array.isArray(skill.evidence) || skill.evidence.length === 0) {
      errors.push(`${prefix}.evidence must include at least one privacy-safe evidence ref`)
    }
  }

  return {
    errors,
    warnings,
    summary: {
      skillCount: Array.isArray(receipt.skills) ? receipt.skills.length : 0,
      unusedInstallCount: warnings.length,
    },
  }
}


export function importMcpTelemetryJsonl(logText) {
  const warnings = []
  const entries = []
  const pending = new Map()
  const toolCalls = []
  let matchedResponseCount = 0
  let missingGatewayLatency = true

  for (const [lineIndex, rawLine] of logText.split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line) continue
    try {
      const entry = JSON.parse(line)
      entries.push(entry)
      const message = unwrapMcpMessage(entry)
      const timestamp = entry.timestamp || entry.time || message.timestamp || null

      if (isToolCallRequest(message)) {
        pending.set(String(message.id), { entry, message, timestamp, lineIndex })
      } else if (message.id != null && pending.has(String(message.id))) {
        const request = pending.get(String(message.id))
        pending.delete(String(message.id))
        matchedResponseCount++
        const durationMs = durationBetween(request.timestamp, timestamp)
        if (durationMs > 0) missingGatewayLatency = false
        toolCalls.push(toolCallFromRequestResponse(request, message, durationMs))
      }
    } catch (err) {
      warnings.push(`line ${lineIndex + 1} was skipped: invalid JSON (${err.message})`)
    }
  }

  for (const request of pending.values()) {
    toolCalls.push(toolCallFromRequestResponse(request, null, 0))
  }

  if (toolCalls.length === 0) warnings.push('no tools/call request/response pairs were found')
  if (missingGatewayLatency) warnings.push('gateway.jsonl-style latency/status evidence is missing; fallback rpc-messages.jsonl can still prove tool-call attribution')

  const receipt = {
    schema: MCP_AUDIT_RECEIPT_SCHEMA,
    run_id: 'mcp-telemetry-import-demo',
    generated_at: '2026-06-07T13:00:00Z',
    server: {
      name: 'mcp-gateway-or-fallback-log',
      transport: 'jsonrpc-jsonl',
      version: 'unknown',
    },
    client: {
      name: 'unknown-mcp-client',
      workspace: 'redacted',
    },
    audit_policy: {
      raw_arguments: 'redacted_shape_only',
      raw_results: 'redacted_shape_only',
      privacy_boundary: 'source JSONL may contain raw protocol data; receipt keeps only shapes, hashes, status, and timing evidence',
    },
    telemetry_source: {
      kind: missingGatewayLatency ? 'rpc-messages.jsonl-fallback' : 'gateway-or-timestamped-jsonl',
      parsed_entries: entries.length,
      matched_responses: matchedResponseCount,
    },
    tool_calls: toolCalls,
    usage_metrics: buildMcpUsageMetrics(toolCalls),
  }

  return {
    receipt,
    warnings,
    summary: {
      parsedEntryCount: entries.length,
      matchedResponseCount,
      missingGatewayLatency,
    },
  }
}

function unwrapMcpMessage(entry) {
  return entry.message || entry.msg || entry.rpc || entry.jsonrpc_message || entry
}

function isToolCallRequest(message) {
  return message && message.id != null && ['tools/call', 'tools.call', 'mcp.tools.call'].includes(message.method)
}

function toolCallFromRequestResponse(request, response, durationMs) {
  const params = request.message.params || {}
  const toolName = params.name || params.tool_name || params.tool || 'unknown_tool'
  const status = response == null ? 'empty' : response.error ? 'error' : 'ok'
  const resultShape = response == null ? 'missing_response' : response.error ? `error:${response.error.code || 'unknown'}` : shapeLabel(response.result)
  const userSource = request.entry.user_id || request.entry.actor || request.entry.principal || request.entry.session_id || 'unknown-user'
  const tokenSource = request.entry.token_subject || request.entry.token_id || request.entry.principal || 'unknown-token'

  return {
    event: 'mcp.tool_call',
    request_id: String(request.message.id),
    session_id: String(request.entry.session_id || request.entry.run_id || 'unknown-session'),
    user_id_hash: privacyHash(userSource),
    token_subject_hash: privacyHash(tokenSource),
    token_scopes: Array.isArray(request.entry.token_scopes) && request.entry.token_scopes.length > 0 ? request.entry.token_scopes : ['unknown'],
    tool_name: String(toolName),
    args_shape: shapeObject(params.arguments || params.args || {}),
    status,
    duration_ms: Math.max(0, durationMs),
    result_shape: resultShape,
    error_class: response?.error ? String(response.error.code || response.error.message || 'mcp_error') : null,
  }
}

function buildMcpUsageMetrics(toolCalls) {
  const callsByStatus = new Map()
  for (const call of toolCalls) {
    const key = `${call.tool_name}:${call.status}:${call.token_scopes[0] || 'unknown'}`
    callsByStatus.set(key, (callsByStatus.get(key) || 0) + 1)
  }
  const metrics = [...callsByStatus.entries()].map(([key, value]) => ({
    name: 'mcp_tool_calls_total',
    type: 'counter',
    value: String(value),
    labels: ['tool_name', 'status', 'token_scope'],
    dimensions: key,
  }))
  const durations = toolCalls.filter((call) => call.duration_ms > 0)
  if (durations.length > 0) {
    metrics.push({
      name: 'mcp_tool_call_duration_ms',
      type: 'histogram',
      value: String(Math.round(durations.reduce((sum, call) => sum + call.duration_ms, 0) / durations.length)),
      labels: ['tool_name', 'status'],
    })
  }
  return metrics.length > 0 ? metrics : [{ name: 'mcp_tool_calls_total', type: 'counter', value: '0', labels: ['tool_name', 'status'] }]
}

function durationBetween(start, end) {
  if (!start || !end) return 0
  const started = Date.parse(start)
  const ended = Date.parse(end)
  if (Number.isNaN(started) || Number.isNaN(ended) || ended < started) return 0
  return ended - started
}

function privacyHash(value) {
  return `sha256:${createHash('sha256').update(String(value)).digest('hex')}`
}

function shapeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, shapeLabel(nested)]))
}

function shapeLabel(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `array:${value.length}`
  if (typeof value === 'object') return `object:${Object.keys(value).length}`
  if (typeof value === 'string') return looksSensitive(value) ? 'redacted_string' : 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return typeof value
}

function looksSensitive(value) {
  return /select\s|insert\s|update\s|delete\s|token|secret|password|bearer/i.test(value)
}

export function validateMcpAuditReceipt(receipt) {
  const errors = []
  const warnings = []

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${field} must be a non-empty string`)
    }
  }

  function requireArray(value, field) {
    if (!Array.isArray(value) || value.length === 0) {
      errors.push(`${field} must be a non-empty array`)
    }
  }

  function requireNonNegativeNumber(value, field) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      errors.push(`${field} must be a non-negative number`)
    }
  }

  if (receipt.schema !== MCP_AUDIT_RECEIPT_SCHEMA) {
    errors.push(`schema must be ${MCP_AUDIT_RECEIPT_SCHEMA}`)
  }

  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.server?.name, 'server.name')
  requireString(receipt.server?.transport, 'server.transport')
  requireString(receipt.client?.name, 'client.name')
  requireString(receipt.audit_policy?.raw_arguments, 'audit_policy.raw_arguments')
  requireString(receipt.audit_policy?.raw_results, 'audit_policy.raw_results')
  requireString(receipt.audit_policy?.privacy_boundary, 'audit_policy.privacy_boundary')
  requireArray(receipt.tool_calls, 'tool_calls')
  requireArray(receipt.usage_metrics, 'usage_metrics')

  if (receipt.audit_policy?.raw_arguments !== 'redacted_shape_only') {
    errors.push('audit_policy.raw_arguments must be redacted_shape_only')
  }
  if (receipt.audit_policy?.raw_results !== 'redacted_shape_only') {
    errors.push('audit_policy.raw_results must be redacted_shape_only')
  }

  const lowCardinalityMetricLabels = new Set(['tool_name', 'status', 'token_scope', 'user_type'])

  for (const [index, call] of (receipt.tool_calls || []).entries()) {
    const prefix = `tool_calls[${index}]`
    requireString(call.event, `${prefix}.event`)
    requireString(call.request_id, `${prefix}.request_id`)
    requireString(call.session_id, `${prefix}.session_id`)
    requireString(call.user_id_hash, `${prefix}.user_id_hash`)
    requireString(call.token_subject_hash, `${prefix}.token_subject_hash`)
    requireArray(call.token_scopes, `${prefix}.token_scopes`)
    requireString(call.tool_name, `${prefix}.tool_name`)
    requireString(call.status, `${prefix}.status`)
    requireNonNegativeNumber(call.duration_ms, `${prefix}.duration_ms`)
    requireString(call.result_shape, `${prefix}.result_shape`)

    if (call.event !== 'mcp.tool_call') errors.push(`${prefix}.event must be mcp.tool_call`)
    if (!['ok', 'empty', 'error', 'timeout', 'denied'].includes(call.status)) {
      errors.push(`${prefix}.status must be one of ok|empty|error|timeout|denied`)
    }
    if (!call.args_shape || typeof call.args_shape !== 'object' || Array.isArray(call.args_shape)) {
      errors.push(`${prefix}.args_shape must be an object with redacted argument types/shapes`)
    }
    if (typeof call.args_preview === 'string' || typeof call.result_preview === 'string') {
      errors.push(`${prefix} must not include raw args/results previews; use args_shape/result_shape instead`)
    }
    if (call.error_class != null && typeof call.error_class !== 'string') {
      errors.push(`${prefix}.error_class must be string or null`)
    }
  }

  for (const [index, metric] of (receipt.usage_metrics || []).entries()) {
    const prefix = `usage_metrics[${index}]`
    requireString(metric.name, `${prefix}.name`)
    requireString(metric.type, `${prefix}.type`)
    requireString(metric.value, `${prefix}.value`)
    requireArray(metric.labels, `${prefix}.labels`)

    for (const label of metric.labels || []) {
      if (!lowCardinalityMetricLabels.has(label)) {
        warnings.push(`${prefix}.labels includes high-cardinality label ${label}; prefer ${[...lowCardinalityMetricLabels].join(', ')}`)
      }
    }
  }

  return {
    errors,
    warnings,
    summary: {
      toolCallCount: Array.isArray(receipt.tool_calls) ? receipt.tool_calls.length : 0,
      auditEventCount: Array.isArray(receipt.tool_calls) ? receipt.tool_calls.length : 0,
      metricCount: Array.isArray(receipt.usage_metrics) ? receipt.usage_metrics.length : 0,
    },
  }
}

export function validateMcpTrafficReceipt(receipt) {
  const errors = []
  const warnings = []

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} must be a non-empty string`)
  }
  function requireArray(value, field) {
    if (!Array.isArray(value) || value.length === 0) errors.push(`${field} must be a non-empty array`)
  }
  function requireNonNegativeInteger(value, field) {
    if (!Number.isInteger(value) || value < 0) errors.push(`${field} must be a non-negative integer`)
  }

  if (receipt.schema !== MCP_TRAFFIC_RECEIPT_SCHEMA) errors.push(`schema must be ${MCP_TRAFFIC_RECEIPT_SCHEMA}`)
  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.client?.name, 'client.name')
  requireString(receipt.client?.workspace_hash, 'client.workspace_hash')
  requireString(receipt.server?.name, 'server.name')
  requireString(receipt.server?.transport, 'server.transport')
  requireString(receipt.capture?.source, 'capture.source')
  requireString(receipt.capture?.mode, 'capture.mode')
  requireString(receipt.capture?.capability_hash, 'capture.capability_hash')
  requireString(receipt.privacy?.raw_payloads, 'privacy.raw_payloads')
  requireString(receipt.privacy?.argument_policy, 'privacy.argument_policy')
  requireString(receipt.privacy?.response_policy, 'privacy.response_policy')
  requireArray(receipt.frames, 'frames')
  requireArray(receipt.tool_calls, 'tool_calls')

  if (receipt.privacy?.raw_payloads !== 'excluded') errors.push('privacy.raw_payloads must be excluded')
  if (receipt.privacy?.argument_policy !== 'hash_or_shape_only') errors.push('privacy.argument_policy must be hash_or_shape_only')
  if (receipt.privacy?.response_policy !== 'hash_or_shape_only') errors.push('privacy.response_policy must be hash_or_shape_only')

  const allowedFrameKinds = new Set(['request', 'response', 'notification'])
  for (const [index, frame] of (receipt.frames || []).entries()) {
    const prefix = `frames[${index}]`
    requireString(frame.frame_id, `${prefix}.frame_id`)
    requireString(frame.direction, `${prefix}.direction`)
    requireString(frame.kind, `${prefix}.kind`)
    requireString(frame.method, `${prefix}.method`)
    requireString(frame.payload_hash, `${prefix}.payload_hash`)
    requireString(frame.timestamp, `${prefix}.timestamp`)
    if (!['client_to_server', 'server_to_client'].includes(frame.direction)) errors.push(`${prefix}.direction must be client_to_server or server_to_client`)
    if (!allowedFrameKinds.has(frame.kind)) errors.push(`${prefix}.kind must be request, response, or notification`)
    if (typeof frame.payload !== 'undefined' || typeof frame.raw_payload !== 'undefined') errors.push(`${prefix} must not include raw payload data`)
  }

  for (const [index, call] of (receipt.tool_calls || []).entries()) {
    const prefix = `tool_calls[${index}]`
    requireString(call.call_id, `${prefix}.call_id`)
    requireString(call.tool_name, `${prefix}.tool_name`)
    requireString(call.request_frame_id, `${prefix}.request_frame_id`)
    requireString(call.status, `${prefix}.status`)
    requireString(call.argument_hash, `${prefix}.argument_hash`)
    requireString(call.response_hash, `${prefix}.response_hash`)
    requireNonNegativeInteger(call.duration_ms, `${prefix}.duration_ms`)
    if (!['ok', 'error', 'pending', 'hung', 'denied'].includes(call.status)) errors.push(`${prefix}.status must be one of ok|error|pending|hung|denied`)
    if (call.status === 'hung' && call.duration_ms < 30000) warnings.push(`${prefix} is marked hung with duration under 30000ms`)
    if (typeof call.arguments !== 'undefined' || typeof call.response !== 'undefined') errors.push(`${prefix} must not include raw arguments or response`)
  }

  const replayArtifacts = Array.isArray(receipt.replay_artifacts) ? receipt.replay_artifacts : []
  if (replayArtifacts.length === 0) warnings.push('replay_artifacts is empty; reviewers cannot verify replay evidence')
  for (const [index, artifact] of replayArtifacts.entries()) {
    const prefix = `replay_artifacts[${index}]`
    requireString(artifact.call_id, `${prefix}.call_id`)
    requireString(artifact.artifact_hash, `${prefix}.artifact_hash`)
    requireString(artifact.isolation, `${prefix}.isolation`)
    requireString(artifact.verdict, `${prefix}.verdict`)
  }

  return {
    errors,
    warnings,
    summary: {
      frameCount: Array.isArray(receipt.frames) ? receipt.frames.length : 0,
      toolCallCount: Array.isArray(receipt.tool_calls) ? receipt.tool_calls.length : 0,
      hungCallCount: Array.isArray(receipt.tool_calls) ? receipt.tool_calls.filter((call) => call.status === 'hung').length : 0,
      replayableCallCount: replayArtifacts.length,
    },
  }
}


export function validateToolSurfaceDiffReceipt(receipt) {
  const errors = []
  const warnings = []

  function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} must be a non-empty string`)
  }
  function requireBoolean(value, field) {
    if (typeof value !== 'boolean') errors.push(`${field} must be boolean`)
  }
  function requireNonNegativeInteger(value, field) {
    if (!Number.isInteger(value) || value < 0) errors.push(`${field} must be a non-negative integer`)
  }
  function requireArray(value, field) {
    if (!Array.isArray(value) || value.length === 0) errors.push(`${field} must be a non-empty array`)
  }

  if (receipt.schema !== TOOL_SURFACE_DIFF_SCHEMA) errors.push(`schema must be ${TOOL_SURFACE_DIFF_SCHEMA}`)
  requireString(receipt.run_id, 'run_id')
  requireString(receipt.generated_at, 'generated_at')
  requireString(receipt.platform?.name, 'platform.name')
  requireString(receipt.platform?.audit_sink, 'platform.audit_sink')
  requireString(receipt.catalog?.server_id, 'catalog.server_id')
  requireString(receipt.catalog?.previous_hash, 'catalog.previous_hash')
  requireString(receipt.catalog?.current_hash, 'catalog.current_hash')
  requireBoolean(receipt.runtime_discovery?.enabled, 'runtime_discovery.enabled')
  requireString(receipt.runtime_discovery?.trigger, 'runtime_discovery.trigger')
  requireArray(receipt.tools, 'tools')
  requireString(receipt.privacy_boundary?.raw_schemas, 'privacy_boundary.raw_schemas')
  requireString(receipt.privacy_boundary?.raw_prompts, 'privacy_boundary.raw_prompts')
  requireString(receipt.privacy_boundary?.raw_results, 'privacy_boundary.raw_results')

  if (receipt.privacy_boundary?.raw_schemas !== 'omitted_hash_only') errors.push('privacy_boundary.raw_schemas must be omitted_hash_only')
  if (receipt.privacy_boundary?.raw_prompts !== 'omitted') errors.push('privacy_boundary.raw_prompts must be omitted')
  if (receipt.privacy_boundary?.raw_results !== 'omitted') errors.push('privacy_boundary.raw_results must be omitted')

  const statuses = new Set(['discovered', 'activated', 'withheld', 'blocked', 'removed'])
  const outcomes = new Set(['accepted', 'blocked_by_rai', 'blocked_by_xpia', 'schema_invalid', 'entitlement_filtered', 'not_selected', 'removed'])
  let discoveredCount = 0
  let activatedCount = 0
  let withheldCount = 0
  let rawLeakCount = 0

  for (const [index, tool] of (receipt.tools || []).entries()) {
    const prefix = `tools[${index}]`
    requireString(tool.tool_id, `${prefix}.tool_id`)
    requireString(tool.name_hash, `${prefix}.name_hash`)
    requireString(tool.schema_hash, `${prefix}.schema_hash`)
    requireString(tool.status, `${prefix}.status`)
    requireString(tool.validation_outcome, `${prefix}.validation_outcome`)
    requireNonNegativeInteger(tool.diff_summary?.added_fields, `${prefix}.diff_summary.added_fields`)
    requireNonNegativeInteger(tool.diff_summary?.removed_fields, `${prefix}.diff_summary.removed_fields`)
    requireNonNegativeInteger(tool.diff_summary?.changed_fields, `${prefix}.diff_summary.changed_fields`)

    if (!statuses.has(tool.status)) errors.push(`${prefix}.status must be one of ${[...statuses].join('|')}`)
    if (!outcomes.has(tool.validation_outcome)) errors.push(`${prefix}.validation_outcome must be one of ${[...outcomes].join('|')}`)
    if (!String(tool.name_hash || '').startsWith('sha256:')) errors.push(`${prefix}.name_hash must be a sha256: hash, not a raw tool name`)
    if (!String(tool.schema_hash || '').startsWith('sha256:')) errors.push(`${prefix}.schema_hash must be a sha256: hash, not a raw schema`)
    if (typeof tool.raw_schema === 'string' || typeof tool.description === 'string') rawLeakCount++

    if (['discovered', 'activated', 'withheld', 'blocked'].includes(tool.status)) discoveredCount++
    if (tool.status === 'activated') activatedCount++
    if (['withheld', 'blocked'].includes(tool.status)) withheldCount++
  }

  if (rawLeakCount > 0) errors.push(`tools must not include raw_schema or description (${rawLeakCount} raw fields found)`)
  if (activatedCount === 0) warnings.push('no activated tools recorded; receipt may only prove discovery/withholding')
  if (withheldCount === 0) warnings.push('no withheld/blocked tools recorded; receipt does not prove negative space')

  return {
    errors,
    warnings,
    summary: { discoveredCount, activatedCount, withheldCount },
  }
}
