#!/usr/bin/env node

import fs from 'node:fs'

const path = process.argv[2]

if (!path) {
  console.error('Usage: node examples/evidence-attestation/check-evidence-attestation.mjs <attestation.json>')
  process.exit(2)
}

let receipt
try {
  receipt = JSON.parse(fs.readFileSync(path, 'utf8'))
} catch (err) {
  console.error(`Could not read attestation JSON: ${err.message}`)
  process.exit(2)
}

const errors = validateEvidenceAttestation(receipt)

if (errors.length > 0) {
  console.error('❌ evidence attestation invalid')
  for (const error of errors) console.error(`   • ${error}`)
  process.exit(1)
}

const supported = receipt.claims.filter((claim) => claim.status === 'supported').length
const unresolved = receipt.claims.filter((claim) => claim.status === 'unknown' || claim.status === 'not_checked').length
console.log(`✅ evidence attestation ok: ${receipt.evidence.length} evidence refs, ${receipt.claims.length} claims, ${supported} supported, ${unresolved} unresolved, verdict ${receipt.verdict}`)
console.log('   privacy ok: no raw prompts/transcripts/source/secrets/customer data copied')

function validateEvidenceAttestation(value) {
  const errors = []
  const verdicts = new Set(['accepted', 'rejected', 'review_required', 'blocked'])
  const kinds = new Set(['review', 'memory_answer', 'handoff', 'approval', 'score', 'skill_claim', 'tool_dispatch'])
  const claimStatuses = new Set(['supported', 'contradicted', 'unknown', 'not_checked'])
  const sourceLabels = new Set(['observed', 'official', 'community_claim', 'inferred', 'human_provided'])

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['receipt must be a JSON object']
  }

  if (value.receipt_type !== 'pluribus.evidence_attestation.v1') {
    errors.push('receipt_type must be pluribus.evidence_attestation.v1')
  }
  if (value.skill !== 'evidence-attestation') {
    errors.push('skill must be evidence-attestation')
  }
  if (!value.subject || typeof value.subject !== 'object') {
    errors.push('subject object is required')
  } else {
    if (!kinds.has(value.subject.kind)) errors.push(`subject.kind must be one of ${[...kinds].join(', ')}`)
    if (!isSha(value.subject.id_hash)) errors.push('subject.id_hash must be a sha256:... digest')
    if (!nonEmptyString(value.subject.summary)) errors.push('subject.summary is required')
  }

  if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
    errors.push('evidence must be a non-empty array')
  } else {
    for (const [index, evidence] of value.evidence.entries()) {
      const label = `evidence[${index}]`
      if (!nonEmptyString(evidence.id)) errors.push(`${label}.id is required`)
      if (!nonEmptyString(evidence.kind)) errors.push(`${label}.kind is required`)
      if (!nonEmptyString(evidence.ref)) errors.push(`${label}.ref is required`)
      if (!isSha(evidence.ref_hash)) errors.push(`${label}.ref_hash must be a sha256:... digest`)
      if (!nonEmptyString(evidence.observed_at)) errors.push(`${label}.observed_at is required`)
      if (!sourceLabels.has(evidence.source_label)) errors.push(`${label}.source_label must be one of ${[...sourceLabels].join(', ')}`)
      if (!Array.isArray(evidence.supports) || evidence.supports.length === 0) errors.push(`${label}.supports must be a non-empty array`)
      if (evidence.raw_content_copied !== false) errors.push(`${label}.raw_content_copied must be false`)
    }
  }

  if (!Array.isArray(value.claims) || value.claims.length === 0) {
    errors.push('claims must be a non-empty array')
  } else {
    const claimIds = new Set()
    for (const [index, claim] of value.claims.entries()) {
      const label = `claims[${index}]`
      if (!nonEmptyString(claim.id)) errors.push(`${label}.id is required`)
      else claimIds.add(claim.id)
      if (!nonEmptyString(claim.text)) errors.push(`${label}.text is required`)
      if (!claimStatuses.has(claim.status)) errors.push(`${label}.status must be one of ${[...claimStatuses].join(', ')}`)
    }
    for (const [index, evidence] of (value.evidence || []).entries()) {
      for (const claimId of evidence.supports || []) {
        if (!claimIds.has(claimId)) errors.push(`evidence[${index}].supports references unknown claim ${claimId}`)
      }
    }
  }

  if (!verdicts.has(value.verdict)) errors.push(`verdict must be one of ${[...verdicts].join(', ')}`)
  if (value.verdict === 'accepted' && value.claims?.some((claim) => claim.status !== 'supported')) {
    errors.push('accepted verdict requires every claim to be supported')
  }

  const requiredPrivacy = ['raw_prompts_copied', 'raw_transcript_copied', 'raw_source_copied', 'secrets_copied', 'customer_data_copied']
  if (!value.privacy || typeof value.privacy !== 'object') {
    errors.push('privacy object is required')
  } else {
    for (const key of requiredPrivacy) {
      if (value.privacy[key] !== false) errors.push(`privacy.${key} must be false`)
    }
  }

  for (const field of ['omissions', 'limits', 'stale_if']) {
    if (!Array.isArray(value[field]) || value[field].length === 0 || value[field].some((entry) => !nonEmptyString(entry))) {
      errors.push(`${field} must be a non-empty array of strings`)
    }
  }

  return errors
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isSha(value) {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
}
