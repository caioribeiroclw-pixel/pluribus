#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [receiptName = 'safe-edit-receipt.json'] = process.argv.slice(2);
const contract = JSON.parse(readFileSync(join(here, 'module-contract.json'), 'utf8'));
const receipt = JSON.parse(readFileSync(join(here, receiptName), 'utf8'));

const startsWithAny = (value, prefixes) => prefixes.some((prefix) => value.startsWith(prefix));
const failures = [];

if (receipt.receipt_type !== 'pluribus.module_boundary_contract.v1') {
  failures.push('unknown receipt_type');
}
if (receipt.contract_id !== contract.contract_id) {
  failures.push(`contract_id mismatch: expected ${contract.contract_id}`);
}
if (receipt.agent_read_contract !== true) {
  failures.push('agent_read_contract must be true before edits are accepted');
}
for (const path of receipt.changed_paths ?? []) {
  if (!startsWithAny(path, contract.edit_path_prefixes)) {
    failures.push(`changed path outside contract: ${path}`);
  }
}
for (const prefix of receipt.import_prefixes_used ?? []) {
  if (startsWithAny(prefix, contract.forbidden_import_prefixes)) {
    failures.push(`forbidden import prefix used: ${prefix}`);
  }
  if (!startsWithAny(prefix, contract.allowed_import_prefixes)) {
    failures.push(`import prefix not listed as allowed: ${prefix}`);
  }
}
if (receipt.verifier?.command !== contract.minimum_verifier) {
  failures.push(`verifier command mismatch: expected ${contract.minimum_verifier}`);
}
if (receipt.verifier?.exit_code !== 0 || receipt.verifier?.completed_after_last_edit !== true) {
  failures.push('verifier must pass after the last edit');
}
if (receipt.privacy?.raw_source_included !== false || receipt.privacy?.raw_prompt_included !== false) {
  failures.push('receipt must not include raw source or raw prompt content');
}

const expectedDecision = failures.length === 0 ? 'accepted' : 'needs_wider_contract';
if (receipt.decision !== expectedDecision) {
  failures.push(`decision should be ${expectedDecision}, got ${receipt.decision}`);
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, receipt: receiptName, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  receipt: receiptName,
  decision: receipt.decision,
  changed_paths: receipt.changed_paths.length,
  import_prefixes_used: receipt.import_prefixes_used.length,
  privacy: receipt.privacy
}, null, 2));
