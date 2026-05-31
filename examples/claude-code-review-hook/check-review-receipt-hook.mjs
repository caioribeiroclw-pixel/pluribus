#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [receiptPathArg] = process.argv.slice(2)

if (!receiptPathArg) {
  console.error(JSON.stringify({ ok: false, errors: ['usage: node check-review-receipt-hook.mjs <receipt.json>'] }, null, 2))
  process.exit(2)
}

const stdin = readFileSync(0, 'utf8').trim()
let hookInput = {}
if (stdin) {
  try {
    hookInput = JSON.parse(stdin)
  } catch (error) {
    console.error(JSON.stringify({ ok: false, errors: [`invalid hook JSON on stdin: ${error.message}`] }, null, 2))
    process.exit(2)
  }
}

const here = dirname(fileURLToPath(import.meta.url))
const localGate = resolve(here, '../review-primitive-gate/check-review-receipt.mjs')
const copiedGate = resolve(here, 'check-review-receipt.mjs')
const gatePath = process.env.PLURIBUS_REVIEW_GATE || (exists(copiedGate) ? copiedGate : localGate)
const receiptPath = resolve(process.cwd(), receiptPathArg)

const result = spawnSync(process.execPath, [gatePath, receiptPath], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
})

let gateResult = null
try {
  gateResult = JSON.parse(result.stdout || '{}')
} catch {
  gateResult = { ok: false, errors: ['review gate did not return JSON'], raw_stdout: result.stdout.trim() }
}

const hookEventName = hookInput.hook_event_name || hookInput.hookEventName || hookInput.event || 'unknown'
const output = {
  ok: result.status === 0 && gateResult.ok === true,
  hook_event_name: hookEventName,
  receipt_path: receiptPathArg,
  resume_state: gateResult.resume_state,
  assignment_id: gateResult.assignment_id,
  run_id: gateResult.run_id,
  next_safe_action: readNextSafeAction(receiptPath),
  errors: gateResult.errors || [],
  warnings: gateResult.warnings || []
}

if (output.ok) {
  console.log(JSON.stringify(output, null, 2))
  process.exit(0)
}

console.error(JSON.stringify(output, null, 2))
process.exit(result.status || 1)

function exists(path) {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}

function readNextSafeAction(path) {
  try {
    const receipt = JSON.parse(readFileSync(path, 'utf8'))
    return receipt?.handoff?.next_safe_action || null
  } catch {
    return null
  }
}
