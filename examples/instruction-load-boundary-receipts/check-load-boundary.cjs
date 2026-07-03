#!/usr/bin/env node
const fs = require('node:fs');

const receiptPath = process.argv[2];
if (!receiptPath) {
  console.error('usage: node check-load-boundary.cjs <receipt.json>');
  process.exit(2);
}

let receipt;
try {
  receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
} catch (error) {
  console.error(`failed to read receipt: ${error.message}`);
  process.exit(2);
}

const failures = [];
const files = Array.isArray(receipt.files) ? receipt.files : [];
if (receipt.schema !== 'pluribus.instruction_load_boundary_receipt.v1') {
  failures.push('schema must be pluribus.instruction_load_boundary_receipt.v1');
}
if (!files.length) failures.push('receipt.files must contain at least one file');

const hashRe = /^sha256:[a-f0-9]{64}$/;
const allowedStatuses = new Set(['clean', 'review_required', 'blocked']);
const allowedSeverity = new Set(['low', 'medium', 'high', 'critical']);

let cleanCount = 0;
let gatedCount = 0;

for (const [index, file] of files.entries()) {
  const label = file.path || `files[${index}]`;
  for (const field of ['path', 'git_blob', 'visible_text_hash', 'agent_read_text_hash', 'status']) {
    if (!file[field]) failures.push(`${label}: missing ${field}`);
  }
  for (const field of ['git_blob', 'visible_text_hash', 'agent_read_text_hash']) {
    if (file[field] && !hashRe.test(file[field])) failures.push(`${label}: ${field} must be sha256:<64 hex>`);
  }
  if (!Array.isArray(file.surfaces) || file.surfaces.length === 0) {
    failures.push(`${label}: surfaces must name at least one instruction surface`);
  }
  if (!allowedStatuses.has(file.status)) {
    failures.push(`${label}: status must be clean, review_required, or blocked`);
  }
  const deltas = Array.isArray(file.deltas) ? file.deltas : [];
  const hashesDiffer = file.visible_text_hash && file.agent_read_text_hash && file.visible_text_hash !== file.agent_read_text_hash;

  if (hashesDiffer && file.status === 'clean') {
    failures.push(`${label}: visible_text_hash differs from agent_read_text_hash but status is clean`);
  }
  if (!hashesDiffer && deltas.length > 0) {
    failures.push(`${label}: deltas are present but visible and agent-read hashes match`);
  }
  if (file.status === 'clean' && deltas.length > 0) {
    failures.push(`${label}: clean files must not contain deltas`);
  }
  if (hashesDiffer && deltas.length === 0) {
    failures.push(`${label}: changed instruction stream needs at least one delta`);
  }

  if (file.remediation?.auto_rewrite === true) {
    failures.push(`${label}: auto_rewrite=true is not reviewable; attach a separate explicit rewrite artifact instead`);
  }
  if ((file.status === 'review_required' || file.status === 'blocked') && !file.remediation?.review_gate) {
    failures.push(`${label}: ${file.status} needs remediation.review_gate`);
  }

  for (const [deltaIndex, delta] of deltas.entries()) {
    const deltaLabel = `${label}: deltas[${deltaIndex}]`;
    for (const field of ['kind', 'agent_reads', 'severity']) {
      if (!delta[field]) failures.push(`${deltaLabel}: missing ${field}`);
    }
    if (!Array.isArray(delta.byte_range) || delta.byte_range.length !== 2 || !delta.byte_range.every(Number.isInteger) || delta.byte_range[0] < 0 || delta.byte_range[1] <= delta.byte_range[0]) {
      failures.push(`${deltaLabel}: byte_range must be [start,end] integers`);
    }
    if (delta.active_instruction !== true && (delta.severity === 'high' || delta.severity === 'critical')) {
      failures.push(`${deltaLabel}: high/critical findings must explicitly set active_instruction=true`);
    }
    if (delta.severity && !allowedSeverity.has(delta.severity)) {
      failures.push(`${deltaLabel}: severity must be low, medium, high, or critical`);
    }
  }

  if (file.status === 'clean') cleanCount += 1;
  if (file.status === 'review_required' || file.status === 'blocked') gatedCount += 1;
}

if (failures.length) {
  console.error(`instruction load-boundary receipt failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`instruction load-boundary receipt ok: ${files.length} files checked, ${cleanCount} clean, ${gatedCount} gated for review`);
