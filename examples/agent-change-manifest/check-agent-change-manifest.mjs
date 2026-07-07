#!/usr/bin/env node
import fs from 'node:fs'

const [,, file = new URL('./agent-change-manifest.json', import.meta.url)] = process.argv
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))

const errors = []
const fail = (message) => errors.push(message)

if (manifest.schema !== 'pluribus.agent_change_manifest.v1') fail('schema must be pluribus.agent_change_manifest.v1')
if (!manifest.subject?.commit || !/^[0-9a-f]{40}$/i.test(manifest.subject.commit)) fail('subject.commit must be a 40-char git sha')
if (!manifest.subject?.git_ref) fail('subject.git_ref is required')
if (!manifest.agent?.surface) fail('agent.surface is required')
if (!manifest.agent?.session_ref) fail('agent.session_ref is required')
if (!manifest.intent?.task_summary) fail('intent.task_summary is required')

const contextRefs = Array.isArray(manifest.context_authority) ? manifest.context_authority : []
if (contextRefs.length === 0) fail('at least one context_authority ref is required')
for (const [index, ref] of contextRefs.entries()) {
  if (!ref.kind || !ref.ref || !ref.hash || !ref.authority) fail(`context_authority[${index}] must include kind/ref/hash/authority`)
  if (ref.hash && !String(ref.hash).startsWith('sha256:')) fail(`context_authority[${index}].hash must be sha256-prefixed`)
}

const commands = Array.isArray(manifest.verification?.commands) ? manifest.verification.commands : []
if (commands.length === 0) fail('verification.commands must include at least one command')
for (const [index, command] of commands.entries()) {
  if (!command.cmd || !command.status || !command.evidence_ref) fail(`verification.commands[${index}] must include cmd/status/evidence_ref`)
  if (!['passed', 'failed', 'skipped'].includes(command.status)) fail(`verification.commands[${index}].status must be passed/failed/skipped`)
}

const notChecked = Array.isArray(manifest.verification?.not_checked) ? manifest.verification.not_checked : []
if (notChecked.length === 0) fail('verification.not_checked should name at least one omitted check')

const trailers = manifest.git_trailers || {}
if (!trailers['Agent-Session']) fail('git_trailers.Agent-Session is required')
if (!trailers['Agent-Manifest']) fail('git_trailers.Agent-Manifest is required')
if (trailers['Agent-Session'] !== manifest.agent?.session_ref) fail('Agent-Session trailer must match agent.session_ref')

const privacy = manifest.privacy || {}
for (const field of ['raw_prompt_included', 'raw_transcript_included', 'raw_source_included', 'secrets_included', 'customer_data_included']) {
  if (privacy[field] !== false) fail(`privacy.${field} must be false`)
}

const staleIf = Array.isArray(manifest.stale_if) ? manifest.stale_if : []
if (staleIf.length < 3) fail('stale_if must list at least three invalidators')

if (!['reviewable', 'unsafe_to_resume', 'needs_human_review'].includes(manifest.verdict)) {
  fail('verdict must be reviewable, unsafe_to_resume, or needs_human_review')
}

if (errors.length) {
  console.error(`agent change manifest invalid: ${errors.length} error(s)`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`agent change manifest ok: ${contextRefs.length} context refs, ${commands.length} commands, ${notChecked.length} not-checked items, verdict ${manifest.verdict}`)
console.log('privacy ok: no raw prompts/transcripts/source/secrets copied')
