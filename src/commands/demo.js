/**
 * pluribus demo — run tiny packaged demos from npm without cloning the repo.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import { fileURLToPath } from 'url'

const DEFAULT_DEMO = 'skill-use-rate'
const SKILL_USE_RATE_DEMO = 'skill-use-rate'
const MCP_AUDIT_RECEIPT_DEMO = 'mcp-audit-receipt'
const MCP_TELEMETRY_IMPORT_DEMO = 'mcp-telemetry-import'
const TOOL_SURFACE_DIFF_DEMO = 'tool-surface-diff'
const CONTEXT_SUFFICIENCY_TRACE_DEMO = 'context-sufficiency-trace'
const MODULE_BOUNDARY_CONTRACT_DEMO = 'module-boundary-contract'
const AVAILABLE_DEMOS = [SKILL_USE_RATE_DEMO, MCP_AUDIT_RECEIPT_DEMO, MCP_TELEMETRY_IMPORT_DEMO, TOOL_SURFACE_DIFF_DEMO, CONTEXT_SUFFICIENCY_TRACE_DEMO, MODULE_BOUNDARY_CONTRACT_DEMO]
const SKILL_USE_RATE_SCHEMA = 'pluribus.skill_use_rate_receipt.v1'
const MCP_AUDIT_RECEIPT_SCHEMA = 'pluribus.mcp_tool_call_audit_receipt.v1'
const TOOL_SURFACE_DIFF_SCHEMA = 'pluribus.mcp_tool_surface_diff_receipt.v1'
const MODULE_BOUNDARY_CONTRACT_SCHEMA = 'pluribus.module_boundary_contract.v1'

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
    case TOOL_SURFACE_DIFF_DEMO:
      return runToolSurfaceDiffDemo(args)
    case CONTEXT_SUFFICIENCY_TRACE_DEMO:
      return runContextSufficiencyTraceDemo(args)
    case MODULE_BOUNDARY_CONTRACT_DEMO:
      return runModuleBoundaryContractDemo(args)
    default:
      console.error(`❌ Unknown demo: ${demoName}`)
      console.error(`   Available demos: ${AVAILABLE_DEMOS.join(', ')}`)
      process.exit(1)
  }
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
