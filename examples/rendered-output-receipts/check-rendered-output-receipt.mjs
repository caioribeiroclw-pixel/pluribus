#!/usr/bin/env node
import fs from 'node:fs';

const receiptPath = process.argv[2];
if (!receiptPath) {
  console.error('usage: node check-rendered-output-receipt.mjs <receipt.json>');
  process.exit(2);
}

const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
const errors = [];
const warnings = [];

if (receipt.schema !== 'pluribus.rendered_output_receipt.v1') {
  errors.push('schema must be pluribus.rendered_output_receipt.v1');
}
if (!receipt.run_id) errors.push('run_id is required');
if (!receipt.generated_at) errors.push('generated_at is required');
if (!receipt.canonical_source?.hash) errors.push('canonical_source.hash is required');
if (!Array.isArray(receipt.render_targets) || receipt.render_targets.length === 0) {
  errors.push('at least one render target is required');
}

for (const [index, target] of (receipt.render_targets || []).entries()) {
  const label = target.client || `target[${index}]`;
  if (!target.client) errors.push(`render_targets[${index}].client is required`);
  if (!target.target_path) errors.push(`${label}: target_path is required`);
  if (!target.before_hash) errors.push(`${label}: before_hash is required`);
  if (!target.rendered_hash) errors.push(`${label}: rendered_hash is required`);
  if (!target.last_known_good_hash) errors.push(`${label}: last_known_good_hash is required`);
  if (!target.rollback_snapshot_id) errors.push(`${label}: rollback_snapshot_id is required`);
  if (target.env_keys?.values_logged !== false) {
    errors.push(`${label}: env_keys.values_logged must be false`);
  }
  if ((target.env_keys?.missing || []).length > 0) {
    warnings.push(`${label}: missing env keys: ${target.env_keys.missing.join(', ')}`);
  }
  for (const change of target.server_changes || []) {
    if (!change.server_id) errors.push(`${label}: server_changes[].server_id is required`);
    if (!change.change_kind) errors.push(`${label}: server_changes[].change_kind is required`);
  }
}

for (const [field, value] of Object.entries(receipt.privacy || {})) {
  if (value !== false) errors.push(`privacy.${field} must be false`);
}

if (errors.length > 0) {
  console.error('rendered output receipt invalid:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const changed = receipt.render_targets.filter((target) => target.before_hash !== target.rendered_hash).length;
console.log(
  `rendered output receipt ok: ${receipt.render_targets.length} targets checked, ${changed} changed, ${warnings.length} missing-env warning${warnings.length === 1 ? '' : 's'}`
);
for (const warning of warnings) console.error(`warning: ${warning}`);
