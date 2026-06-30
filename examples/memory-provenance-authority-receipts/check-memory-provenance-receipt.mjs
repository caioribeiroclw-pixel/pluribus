#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [receiptPathArg] = process.argv.slice(2)

if (!receiptPathArg) {
  fail(['usage: node check-memory-provenance-receipt.mjs <receipt.json>'], 2)
}

const receiptPath = resolve(process.cwd(), receiptPathArg)
let receipt
try {
  receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
} catch (error) {
  fail([`could not read receipt JSON: ${error.message}`], 2)
}

const errors = []
const warnings = []

if (receipt.schema !== 'pluribus.memory_provenance_authority_receipt.v1') {
  errors.push('schema must be pluribus.memory_provenance_authority_receipt.v1')
}

const authorityHomes = Array.isArray(receipt.authority_homes) ? receipt.authority_homes : []
const authorityIds = new Set(authorityHomes.map((home) => home?.id).filter(Boolean))
const events = Array.isArray(receipt.memory_events) ? receipt.memory_events : []
const omissions = Array.isArray(receipt.privacy_omissions) ? receipt.privacy_omissions : []

if (authorityHomes.length === 0) errors.push('authority_homes must include at least one authored source')
if (events.length === 0) errors.push('memory_events must include at least one search/load/write event')

for (const home of authorityHomes) {
  if (!home.id) errors.push('authority_home missing id')
  if (!home.kind) errors.push(`authority_home ${home.id || '<unknown>'} missing kind`)
  if (!home.path_hash) errors.push(`authority_home ${home.id || '<unknown>'} missing path_hash`)
  if (!home.git_ref) warnings.push(`authority_home ${home.id || '<unknown>'} missing git_ref; freshness may be hard to review`)
}

for (const event of events) {
  const id = event.id || '<unknown>'
  if (!event.operation) errors.push(`memory_event ${id} missing operation`)
  if (!event.source_hash) errors.push(`memory_event ${id} missing source_hash`)
  if (!event.claim) errors.push(`memory_event ${id} missing claim summary`)

  if (event.used_as_authority === true) {
    if (!event.authority_home) errors.push(`used memory_event ${id} must cite authority_home`)
    if (event.authority_home && !authorityIds.has(event.authority_home)) {
      errors.push(`memory_event ${id} cites unknown authority_home ${event.authority_home}`)
    }
    if (!event.verification_path) errors.push(`used memory_event ${id} must include verification_path`)
    if (['stale', 'superseded', 'unknown'].includes(event.freshness)) {
      errors.push(`memory_event ${id} cannot be used_as_authority when freshness is ${event.freshness}`)
    }
  }

  if (['stale', 'superseded'].includes(event.freshness) && event.used_as_authority !== false) {
    errors.push(`stale/superseded memory_event ${id} must be suppressed, not used`)
  }

  if (event.used_as_authority === false && !event.suppressed_reason) {
    warnings.push(`suppressed memory_event ${id} should include suppressed_reason`)
  }
}

if (omissions.length === 0) {
  errors.push('privacy_omissions must record raw memory/customer data omitted from the receipt')
}

for (const omission of omissions) {
  if (!omission.category) errors.push('privacy_omission missing category')
  if (typeof omission.count !== 'number') warnings.push(`privacy_omission ${omission.category || '<unknown>'} missing numeric count`)
}

if (errors.length > 0 && receipt.decision?.status === 'safe_to_continue') {
  errors.push('decision.status cannot be safe_to_continue when provenance errors exist')
}

const output = {
  ok: errors.length === 0,
  receipt_id: receipt.receipt_id || null,
  task_id: receipt.task_id || null,
  authority_home_count: authorityHomes.length,
  memory_event_count: events.length,
  used_as_authority_count: events.filter((event) => event.used_as_authority === true).length,
  suppressed_count: events.filter((event) => event.used_as_authority === false).length,
  decision_status: receipt.decision?.status || null,
  errors,
  warnings
}

if (output.ok) {
  console.log(JSON.stringify(output, null, 2))
  process.exit(0)
}

console.error(JSON.stringify(output, null, 2))
process.exit(1)

function fail(errors, code) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2))
  process.exit(code)
}
