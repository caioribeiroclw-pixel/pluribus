#!/usr/bin/env node
import fs from 'node:fs'

const [,, file = new URL('./config-treatment-receipt.json', import.meta.url)] = process.argv
const receipt = JSON.parse(fs.readFileSync(file, 'utf8'))

const errors = []
const fail = (message) => errors.push(message)
const sha = (value) => typeof value === 'string' && value.startsWith('sha256:')

if (receipt.schema !== 'pluribus.config_treatment_receipt.v1') fail('schema must be pluribus.config_treatment_receipt.v1')
if (!receipt.subject?.repo) fail('subject.repo is required')
if (!/^[0-9a-f]{40}$/i.test(receipt.subject?.commit || '')) fail('subject.commit must be a 40-char git sha')
if (!receipt.subject?.treatment_id) fail('subject.treatment_id is required')
if (!receipt.treatment?.tool) fail('treatment.tool is required')
if (!receipt.treatment?.command) fail('treatment.command is required')
if (!receipt.treatment?.authority_home) fail('treatment.authority_home is required')
if (!receipt.canonical_authority?.ref) fail('canonical_authority.ref is required')
if (!sha(receipt.canonical_authority?.hash)) fail('canonical_authority.hash must be sha256-prefixed')

const targets = Array.isArray(receipt.target_surfaces) ? receipt.target_surfaces : []
if (targets.length === 0) fail('target_surfaces must include at least one target')
for (const [index, target] of targets.entries()) {
  if (!target.tool || !target.target_file) fail(`target_surfaces[${index}] must include tool/target_file`)
  if (!sha(target.stub_hash)) fail(`target_surfaces[${index}].stub_hash must be sha256-prefixed`)
  if (!sha(target.loaded_hash)) fail(`target_surfaces[${index}].loaded_hash must be sha256-prefixed`)
  if (!['loaded', 'truncated', 'missing', 'blocked'].includes(target.load_status)) fail(`target_surfaces[${index}].load_status must be loaded/truncated/missing/blocked`)
  if (target.load_status === 'loaded' && target.stub_hash !== target.loaded_hash) fail(`target_surfaces[${index}] is loaded but stub_hash != loaded_hash`)
}

const verification = receipt.verification || {}
if (!verification.drift_gate) fail('verification.drift_gate is required')
if (!verification.eval_ref) fail('verification.eval_ref is required')
if (!['passed', 'failed', 'skipped'].includes(verification.status)) fail('verification.status must be passed/failed/skipped')
if (!Array.isArray(verification.not_checked) || verification.not_checked.length === 0) fail('verification.not_checked must list at least one omitted check')

const privacy = receipt.privacy || {}
for (const field of ['raw_rules_included', 'raw_prompts_included', 'secrets_included', 'customer_data_included']) {
  if (privacy[field] !== false) fail(`privacy.${field} must be false`)
}
const omitted = Array.isArray(privacy.omitted_private_payloads) ? privacy.omitted_private_payloads : []

if (!['usable', 'partial', 'recheck_required', 'unsafe'].includes(receipt.verdict)) {
  fail('verdict must be usable, partial, recheck_required, or unsafe')
}

const staleIf = Array.isArray(receipt.stale_if) ? receipt.stale_if : []
if (staleIf.length < 3) fail('stale_if must list at least three invalidators')

if (errors.length) {
  console.error(`config treatment receipt invalid: ${errors.length} error(s)`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`config treatment receipt ok: ${targets.length} target surfaces, ${omitted.length} omitted private payload, verdict ${receipt.verdict}`)
console.log('privacy ok: no raw rules/prompts/secrets/customer data copied')
