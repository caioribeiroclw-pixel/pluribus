#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const [file] = process.argv.slice(2)

if (!file) {
  console.error('Usage: node check-review-receipt.mjs <receipt.json>')
  process.exit(2)
}

let receipt
try {
  receipt = JSON.parse(readFileSync(file, 'utf8'))
} catch (error) {
  console.error(JSON.stringify({ ok: false, file, errors: [`invalid JSON: ${error.message}`] }, null, 2))
  process.exit(2)
}

const errors = []
const warnings = []

if (receipt.type !== 'agent.review_primitive_receipt.v1') {
  errors.push('type must be agent.review_primitive_receipt.v1')
}

for (const key of ['assignment_id', 'run_id']) {
  if (!receipt[key] || typeof receipt[key] !== 'string') {
    errors.push(`${key} is required`)
  }
}

const boundaries = receipt.approved_boundaries || {}
if (!Array.isArray(boundaries.read) || boundaries.read.length === 0) {
  errors.push('approved_boundaries.read must name at least one coarse read boundary')
}
if (!Array.isArray(boundaries.write)) {
  errors.push('approved_boundaries.write must be an array, even for read-only runs')
}

const scopeChanges = receipt.scope_access_changes || []
if (!Array.isArray(scopeChanges)) {
  errors.push('scope_access_changes must be an array')
} else {
  for (const [index, change] of scopeChanges.entries()) {
    if (change?.approved !== true) {
      errors.push(`scope_access_changes[${index}] is not explicitly approved`)
    }
  }
}

const checks = receipt.commands_and_checks || []
if (!Array.isArray(checks) || checks.length === 0) {
  errors.push('commands_and_checks must include at least one required check/test')
} else {
  for (const [index, check] of checks.entries()) {
    if (!String(check?.kind || '').startsWith('required_')) continue
    if (check.status !== 'passed') {
      errors.push(`commands_and_checks[${index}] required check did not pass: ${check.status || 'missing status'}`)
    }
    if (!check.evidence || check.evidence === 'not-run') {
      errors.push(`commands_and_checks[${index}] required check is missing evidence`)
    }
  }
}

const allowedResumeStates = new Set(['complete', 'partial', 'unsafe-to-resume'])
if (!allowedResumeStates.has(receipt.resume_state)) {
  errors.push('resume_state must be complete, partial, or unsafe-to-resume')
}
if (receipt.resume_state !== 'complete') {
  errors.push(`resume_state is ${receipt.resume_state}; reviewer must inspect before merge/continuation`)
}

const handoff = receipt.handoff || {}
if (!handoff.next_safe_action || typeof handoff.next_safe_action !== 'string') {
  errors.push('handoff.next_safe_action is required')
}
if (!handoff.evidence_path || typeof handoff.evidence_path !== 'string') {
  warnings.push('handoff.evidence_path is recommended for review traceability')
}

const privacy = receipt.privacy || {}
for (const key of ['raw_prompts_logged', 'raw_tool_output_logged', 'source_code_logged', 'secrets_logged']) {
  if (privacy[key] !== false) {
    errors.push(`privacy.${key} must be false for this gate`) 
  }
}

const result = {
  ok: errors.length === 0,
  file,
  assignment_id: receipt.assignment_id,
  run_id: receipt.run_id,
  resume_state: receipt.resume_state,
  errors,
  warnings
}

console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
