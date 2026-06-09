#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [receiptPathArg] = process.argv.slice(2)

if (!receiptPathArg) {
  fail(['usage: node check-attention-receipt.mjs <receipt.json>'], 2)
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

if (receipt.schema !== 'pluribus.context_attention_receipt.v1') {
  errors.push('schema must be pluribus.context_attention_receipt.v1')
}

const requiredIds = ids(receipt.required_context?.map((item) => item.id))
const deliveredIds = ids(receipt.delivery?.delivered_context_ids)
const acknowledgedIds = ids(receipt.attention?.acknowledged_before_plan)
const citedIds = ids(receipt.attention?.cited_in_plan)

if (requiredIds.length === 0) errors.push('required_context must name at least one context id')

for (const id of requiredIds) {
  if (!deliveredIds.includes(id)) errors.push(`required context not delivered: ${id}`)
  if (!acknowledgedIds.includes(id)) errors.push(`required context not acknowledged before plan: ${id}`)
  if (!citedIds.includes(id)) errors.push(`required context not cited in plan: ${id}`)
}

if (receipt.delivery?.raw_context_omitted !== true) {
  errors.push('delivery.raw_context_omitted must be true')
}

const privacy = receipt.privacy || {}
for (const field of [
  'raw_prompts_omitted',
  'raw_documents_omitted',
  'source_code_omitted',
  'tool_outputs_omitted',
  'tokens_omitted',
  'customer_data_omitted'
]) {
  if (privacy[field] !== true) errors.push(`privacy.${field} must be true`)
}

if (errors.length > 0 && receipt.attention?.missing_context_stop !== true) {
  errors.push('missing_context_stop must be true when required context attention evidence is incomplete')
}

if (receipt.result?.status === 'safe_to_continue' && errors.length > 0) {
  errors.push('result.status cannot be safe_to_continue when required evidence is incomplete')
}

if (!receipt.delivery?.evidence_path) {
  warnings.push('delivery.evidence_path is missing; reviewers need a pointer to the audit trail')
}

const output = {
  ok: errors.length === 0,
  receipt_id: receipt.receipt_id || null,
  task_id: receipt.task_id || null,
  agent_surface: receipt.agent_surface || null,
  required_count: requiredIds.length,
  delivered_count: deliveredIds.length,
  acknowledged_count: acknowledgedIds.length,
  cited_count: citedIds.length,
  status: receipt.result?.status || null,
  next_safe_action: receipt.result?.next_safe_action || null,
  errors,
  warnings
}

if (output.ok) {
  console.log(JSON.stringify(output, null, 2))
  process.exit(0)
}

console.error(JSON.stringify(output, null, 2))
process.exit(1)

function ids(value) {
  return Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id.length > 0) : []
}

function fail(errors, code) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2))
  process.exit(code)
}
