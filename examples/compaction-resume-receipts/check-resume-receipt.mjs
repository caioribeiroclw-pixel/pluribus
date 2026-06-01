#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const [file] = process.argv.slice(2)

if (!file) {
  console.error('Usage: node check-resume-receipt.mjs <compaction-resume-receipt.json>')
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

if (receipt.type !== 'agent.compaction_resume_receipt.v1') {
  errors.push('type must be agent.compaction_resume_receipt.v1')
}

for (const key of ['compaction_event_id', 'session_id', 'trigger']) {
  if (!receipt[key] || typeof receipt[key] !== 'string') {
    errors.push(`${key} is required`)
  }
}

const transcript = receipt.transcript || {}
if (!transcript.range || typeof transcript.range !== 'string') {
  errors.push('transcript.range is required')
}
if (!transcript.content_hash || typeof transcript.content_hash !== 'string') {
  errors.push('transcript.content_hash is required; do not log raw transcript text')
}
if (transcript.raw_text_logged !== false) {
  errors.push('transcript.raw_text_logged must be false')
}

const summary = receipt.summary || {}
if (!summary.content_hash || typeof summary.content_hash !== 'string') {
  errors.push('summary.content_hash is required')
}
if (!Number.isInteger(summary.token_count) || summary.token_count <= 0) {
  errors.push('summary.token_count must be a positive integer')
}

const reloads = Array.isArray(receipt.instruction_sources_reloaded)
  ? receipt.instruction_sources_reloaded
  : []
if (reloads.length === 0) {
  errors.push('instruction_sources_reloaded must include at least one source')
}
for (const [index, source] of reloads.entries()) {
  if (!source.kind || typeof source.kind !== 'string') {
    errors.push(`instruction_sources_reloaded[${index}].kind is required`)
  }
  if (!source.ref || typeof source.ref !== 'string') {
    errors.push(`instruction_sources_reloaded[${index}].ref is required`)
  }
  if (!source.content_hash || typeof source.content_hash !== 'string') {
    errors.push(`instruction_sources_reloaded[${index}].content_hash is required`)
  }
  if (source.raw_body_logged !== false) {
    errors.push(`instruction_sources_reloaded[${index}].raw_body_logged must be false`)
  }
}

const state = receipt.state || {}
const kept = Array.isArray(state.kept) ? state.kept : []
const lost = Array.isArray(state.lost) ? state.lost : []
if (kept.length === 0) {
  warnings.push('state.kept is empty; reviewers may not know what survived compaction')
}
if (!Array.isArray(state.lost)) {
  errors.push('state.lost must be an array, even when empty')
}

const verdict = receipt.resume_verdict || {}
if (!['true', 'false', 'unknown'].includes(String(verdict.safe_to_resume))) {
  errors.push('resume_verdict.safe_to_resume must be true, false, or unknown')
}
if (!Array.isArray(verdict.reasons) || verdict.reasons.length === 0) {
  errors.push('resume_verdict.reasons must explain the verdict')
}
if (String(verdict.safe_to_resume) !== 'true') {
  errors.push(`safe_to_resume is ${verdict.safe_to_resume}; stop, reload, or ask before continuing`)
}
if (lost.some((item) => item && item.blocks_resume === true)) {
  errors.push('state.lost contains at least one blocks_resume=true item')
}

const privacy = receipt.privacy || {}
for (const key of ['raw_prompts_logged', 'raw_tool_output_logged', 'secrets_logged', 'full_instruction_bodies_logged']) {
  if (privacy[key] !== false) {
    errors.push(`privacy.${key} must be false`)
  }
}

const result = {
  ok: errors.length === 0,
  file,
  compaction_event_id: receipt.compaction_event_id,
  session_id: receipt.session_id,
  safe_to_resume: verdict.safe_to_resume,
  reloaded_sources: reloads.map((source) => `${source.kind}:${source.ref}`),
  lost: lost.map((item) => item.ref || item.kind || 'unknown'),
  errors,
  warnings
}

console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
