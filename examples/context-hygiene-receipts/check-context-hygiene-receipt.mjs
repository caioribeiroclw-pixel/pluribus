#!/usr/bin/env node
import fs from 'node:fs'

const [,, file = new URL('./context-hygiene-receipt.json', import.meta.url)] = process.argv
const receipt = JSON.parse(fs.readFileSync(file, 'utf8'))

const errors = []
const warnings = []
const fail = (message) => errors.push(message)
const warn = (message) => warnings.push(message)
const sha = (value) => typeof value === 'string' && value.startsWith('sha256:')

if (receipt.schema !== 'pluribus.context_hygiene_receipt.v1') fail('schema must be pluribus.context_hygiene_receipt.v1')
if (receipt.mode !== 'audit_before_prune') fail('mode must be audit_before_prune')
if (!receipt.subject?.repo) fail('subject.repo is required')
if (!/^[0-9a-f]{40}$/i.test(receipt.subject?.commit || '')) fail('subject.commit must be a 40-char git sha')
if (!receipt.subject?.agent_surface) fail('subject.agent_surface is required')

const budget = receipt.context_budget || {}
for (const field of ['startup_token_estimate', 'loaded_token_estimate', 'candidate_savings_estimate']) {
  if (!Number.isFinite(Number(budget[field])) || Number(budget[field]) < 0) fail(`context_budget.${field} must be a non-negative number`)
}
if (!budget.estimate_method) fail('context_budget.estimate_method is required')

const sources = Array.isArray(receipt.loaded_sources) ? receipt.loaded_sources : []
if (!sources.length) fail('loaded_sources must include at least one source')
const sourceIds = new Set()
for (const [index, source] of sources.entries()) {
  if (!source.id) fail(`loaded_sources[${index}].id is required`)
  if (source.id && sourceIds.has(source.id)) fail(`duplicate loaded source id: ${source.id}`)
  if (source.id) sourceIds.add(source.id)
  if (!source.kind) fail(`loaded_sources[${index}].kind is required`)
  if (!source.surface) fail(`loaded_sources[${index}].surface is required`)
  if (!sha(source.source_hash)) fail(`loaded_sources[${index}].source_hash must be sha256-prefixed`)
  if (!Number.isFinite(Number(source.token_estimate)) || Number(source.token_estimate) < 0) fail(`loaded_sources[${index}].token_estimate must be non-negative`)
  if (!['loaded', 'deferred', 'suppressed', 'blocked', 'unknown'].includes(source.load_status)) fail(`loaded_sources[${index}].load_status is invalid`)
  if (!source.last_used_evidence) warn(`${source.id || `loaded_sources[${index}]`} has no last_used_evidence`)
  if (!source.action) fail(`loaded_sources[${index}].action is required`)
}

const candidates = Array.isArray(receipt.candidate_removals) ? receipt.candidate_removals : []
if (!candidates.length) fail('candidate_removals must include at least one candidate')
for (const [index, candidate] of candidates.entries()) {
  if (!sourceIds.has(candidate.source_id)) fail(`candidate_removals[${index}].source_id must reference loaded_sources`)
  if (!candidate.reason) fail(`candidate_removals[${index}].reason is required`)
  if (!Array.isArray(candidate.evidence) || candidate.evidence.length < 2) fail(`candidate_removals[${index}].evidence must include at least two evidence items`)
  if (!Number.isFinite(Number(candidate.estimated_token_savings)) || Number(candidate.estimated_token_savings) <= 0) fail(`candidate_removals[${index}].estimated_token_savings must be positive`)
  if (!['low', 'medium', 'high', 'critical'].includes(candidate.risk)) fail(`candidate_removals[${index}].risk must be low/medium/high/critical`)
  if (candidate.risk === 'critical' && candidate.safe_to_remove === true) fail(`candidate_removals[${index}] cannot remove critical context`)
}

const negativeControls = Array.isArray(receipt.negative_controls) ? receipt.negative_controls : []
if (!negativeControls.length) fail('negative_controls must include safety/policy context that should not be pruned')
for (const [index, control] of negativeControls.entries()) {
  if (!sourceIds.has(control.source_id)) fail(`negative_controls[${index}].source_id must reference loaded_sources`)
  if (!control.why_keep) fail(`negative_controls[${index}].why_keep is required`)
}

if (receipt.review_gate?.human_review_required !== true) fail('review_gate.human_review_required must be true')
if (receipt.review_gate?.cleanup_started !== false) fail('review_gate.cleanup_started must be false for audit_before_prune receipts')
if (receipt.post_cleanup_plan?.before_after_token_counts_required !== true) fail('post_cleanup_plan.before_after_token_counts_required must be true')
if (receipt.post_cleanup_plan?.receipt_after_cleanup_required !== true) fail('post_cleanup_plan.receipt_after_cleanup_required must be true')

if (receipt.rollback?.available !== true) fail('rollback.available must be true')
if (!sha(receipt.rollback?.command_hash)) fail('rollback.command_hash must be sha256-prefixed')

const privacy = receipt.privacy || {}
for (const field of ['raw_prompts_included', 'raw_transcripts_included', 'source_code_included', 'raw_rule_bodies_included', 'raw_memory_bodies_included', 'raw_mcp_schemas_included', 'secrets_included', 'customer_data_included']) {
  if (privacy[field] !== false) fail(`privacy.${field} must be false`)
}
if (privacy.private_paths_hashed !== true) fail('privacy.private_paths_hashed must be true')

const staleIf = Array.isArray(receipt.stale_if) ? receipt.stale_if : []
for (const needed of ['commit_changed', 'context_report_changed', 'loaded_source_hash_changed', 'candidate_removed_without_post_cleanup_receipt', 'rollback_ref_missing']) {
  if (!staleIf.includes(needed)) warn(`stale_if should include ${needed}`)
}

if (!['review_before_cleanup', 'unsafe_to_cleanup', 'cleanup_ready_after_review', 'cleanup_complete'].includes(receipt.verdict)) {
  fail('verdict must be review_before_cleanup, unsafe_to_cleanup, cleanup_ready_after_review, or cleanup_complete')
}
if (receipt.verdict === 'cleanup_complete' && receipt.review_gate?.cleanup_started !== true) fail('cleanup_complete requires cleanup_started=true')

if (errors.length) {
  console.error(`context hygiene receipt invalid: ${errors.length} error(s)`)
  for (const error of errors) console.error(`- ${error}`)
  for (const warning of warnings) console.error(`warning: ${warning}`)
  process.exit(1)
}

console.log(`context hygiene receipt ok: ${sources.length} sources, ${candidates.length} candidates, ${negativeControls.length} negative controls, verdict ${receipt.verdict}`)
console.log('privacy ok: no raw prompts/transcripts/source/rule bodies/secrets/customer data copied')
if (warnings.length) {
  for (const warning of warnings) console.log(`warning: ${warning}`)
}
