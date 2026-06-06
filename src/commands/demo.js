/**
 * pluribus demo — run tiny packaged demos from npm without cloning the repo.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const DEFAULT_DEMO = 'skill-use-rate'
const SKILL_USE_RATE_DEMO = 'skill-use-rate'
const MCP_AUDIT_RECEIPT_DEMO = 'mcp-audit-receipt'
const AVAILABLE_DEMOS = [SKILL_USE_RATE_DEMO, MCP_AUDIT_RECEIPT_DEMO]
const SKILL_USE_RATE_SCHEMA = 'pluribus.skill_use_rate_receipt.v1'
const MCP_AUDIT_RECEIPT_SCHEMA = 'pluribus.mcp_tool_call_audit_receipt.v1'

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

function bundledSkillUseRateReceiptPath() {
  return fileURLToPath(new URL('../../examples/skill-use-rate-receipts/skill-use-rate-receipt.json', import.meta.url))
}

function bundledMcpAuditReceiptPath() {
  return fileURLToPath(new URL('../../examples/mcp-audit-receipts/mcp-audit-receipt.json', import.meta.url))
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
