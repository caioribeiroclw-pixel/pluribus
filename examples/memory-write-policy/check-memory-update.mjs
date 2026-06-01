#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const [file] = process.argv.slice(2)

if (!file) {
  console.error('Usage: node check-memory-update.mjs <memory-update-receipt.json>')
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

if (receipt.type !== 'agent.memory_update_receipt.v1') {
  errors.push('type must be agent.memory_update_receipt.v1')
}

for (const key of ['update_id', 'run_id']) {
  if (!receipt[key] || typeof receipt[key] !== 'string') {
    errors.push(`${key} is required`)
  }
}

const source = receipt.source || {}
if (!source.kind || typeof source.kind !== 'string') {
  errors.push('source.kind is required')
}
if (!source.ref || typeof source.ref !== 'string') {
  errors.push('source.ref is required')
}
if (!source.content_hash || typeof source.content_hash !== 'string') {
  errors.push('source.content_hash is required; do not rely on raw memory text')
}

const scope = receipt.scope || {}
if (!scope.kind || !['repo', 'project', 'org', 'user'].includes(scope.kind)) {
  errors.push('scope.kind must be repo, project, org, or user')
}
if (!scope.id || typeof scope.id !== 'string') {
  errors.push('scope.id is required so a memory write cannot silently become global')
}
if (scope.kind === 'user') {
  warnings.push('user-scoped durable memory is broad; prefer repo/project scope when possible')
}

const diff = receipt.proposed_diff || {}
const changed = ['adds', 'updates', 'supersedes', 'expires'].flatMap((key) => Array.isArray(diff[key]) ? diff[key] : [])
if (changed.length === 0) {
  errors.push('proposed_diff must include at least one add, update, supersede, or expire entry')
}
for (const [index, item] of changed.entries()) {
  if (!item.memory_ref || typeof item.memory_ref !== 'string') {
    errors.push(`proposed_diff item ${index} is missing memory_ref`)
  }
  if (!item.summary_hash || typeof item.summary_hash !== 'string') {
    errors.push(`proposed_diff item ${index} is missing summary_hash; log hashes, not raw memory bodies`)
  }
  if (item.raw_text) {
    errors.push(`proposed_diff item ${index} must not include raw_text`)
  }
}

const policy = receipt.write_policy || {}
if (policy.status !== 'approved') {
  errors.push(`write_policy.status is ${policy.status || 'missing'}; shared memory write must remain proposed/quarantined until approved`)
}
if (!policy.policy_ref || typeof policy.policy_ref !== 'string') {
  errors.push('write_policy.policy_ref is required')
}
if (!policy.approved_by || typeof policy.approved_by !== 'string') {
  errors.push('write_policy.approved_by is required for durable writes')
}
if (policy.private_or_sensitive_detected !== false) {
  errors.push('write_policy.private_or_sensitive_detected must be false before merge')
}

const lifecycle = receipt.lifecycle || {}
if (!lifecycle.expires_at && !lifecycle.review_after) {
  errors.push('lifecycle.expires_at or lifecycle.review_after is required to avoid immortal stale facts')
}
if (lifecycle.supersedes_required === true && (!Array.isArray(diff.supersedes) || diff.supersedes.length === 0)) {
  errors.push('lifecycle.supersedes_required is true but proposed_diff.supersedes is empty')
}

const visibility = receipt.injection_visibility || {}
if (visibility.next_session_visible !== true) {
  errors.push('injection_visibility.next_session_visible must be true so future agents can see what memory was injected')
}
if (!visibility.preview_path || typeof visibility.preview_path !== 'string') {
  warnings.push('injection_visibility.preview_path is recommended for human review')
}

const privacy = receipt.privacy || {}
for (const key of ['raw_memory_text_logged', 'raw_prompts_logged', 'raw_tool_output_logged', 'secrets_logged']) {
  if (privacy[key] !== false) {
    errors.push(`privacy.${key} must be false for this gate`)
  }
}

const result = {
  ok: errors.length === 0,
  file,
  update_id: receipt.update_id,
  run_id: receipt.run_id,
  scope: scope.kind && scope.id ? `${scope.kind}:${scope.id}` : undefined,
  write_status: policy.status,
  errors,
  warnings
}

console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
