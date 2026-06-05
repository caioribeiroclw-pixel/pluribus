#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const receiptPath = process.argv[2] || path.join(import.meta.dirname, 'skill-use-rate-receipt.json')
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
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

if (receipt.schema !== 'pluribus.skill_use_rate_receipt.v1') {
  errors.push('schema must be pluribus.skill_use_rate_receipt.v1')
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

if (errors.length > 0) {
  console.error('skill use-rate receipt invalid:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

const warningLabel = warnings.length === 1 ? 'warning' : 'warnings'
console.log(`skill use-rate receipt ok: ${receipt.skills.length} skills checked, ${warnings.length} unused install ${warningLabel}`)
for (const warning of warnings) console.log(`- ${warning}`)
