/**
 * pluribus demo — run tiny packaged demos from npm without cloning the repo.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const DEFAULT_DEMO = 'skill-use-rate'
const SKILL_USE_RATE_SCHEMA = 'pluribus.skill_use_rate_receipt.v1'

/**
 * @param {Record<string, string | boolean>} args
 * @param {string[]} positional
 */
export async function runDemo(args, positional = []) {
  const demoName = positional[0] || DEFAULT_DEMO

  if (demoName !== DEFAULT_DEMO) {
    console.error(`❌ Unknown demo: ${demoName}`)
    console.error('   Available demos: skill-use-rate')
    process.exit(1)
  }

  const receiptPath = typeof args.receipt === 'string' && args.receipt.trim()
    ? path.resolve(process.cwd(), args.receipt)
    : bundledSkillUseRateReceiptPath()

  let receipt
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  } catch (err) {
    console.error(`❌ Could not read skill use-rate receipt at ${receiptPath}: ${err.message}`)
    process.exit(1)
  }

  const result = validateSkillUseRateReceipt(receipt)
  if (Boolean(args.json)) {
    console.log(JSON.stringify({
      ok: result.errors.length === 0,
      demo: DEFAULT_DEMO,
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

function bundledSkillUseRateReceiptPath() {
  return fileURLToPath(new URL('../../examples/skill-use-rate-receipts/skill-use-rate-receipt.json', import.meta.url))
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
