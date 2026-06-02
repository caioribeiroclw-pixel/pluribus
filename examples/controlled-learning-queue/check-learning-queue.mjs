#!/usr/bin/env node
import fs from 'node:fs';

const file = process.argv[2] || new URL('./learning_queue.md', import.meta.url).pathname;
const text = fs.readFileSync(file, 'utf8');
const proposals = text.split(/^## Proposal /m).slice(1);
const required = ['Status', 'Source', 'Observed', 'Proposed durable change', 'Reason', 'Scope', 'Expiry', 'Reviewer', 'Decision'];
const rawRisk = /(api[_-]?key|secret|password|token\s*[:=]|-----BEGIN|raw transcript|verbatim customer|full email)/i;
const errors = [];
let pending = 0;

if (proposals.length === 0) errors.push('missing proposals');

for (const [index, block] of proposals.entries()) {
  const id = block.split('\n', 1)[0].trim() || `#${index + 1}`;
  for (const field of required) {
    if (!new RegExp(`^${field}:\\s*\\S`, 'mi').test(block)) {
      errors.push(`${id}: missing ${field}`);
    }
  }

  const status = block.match(/^Status:\s*(.+)$/mi)?.[1]?.trim().toLowerCase();
  const reviewer = block.match(/^Reviewer:\s*(.+)$/mi)?.[1]?.trim().toLowerCase();
  const decision = block.match(/^Decision:\s*(.+)$/mi)?.[1]?.trim().toLowerCase();

  if (status === 'proposed') pending += 1;
  if (status === 'promoted' && (!reviewer || reviewer === 'pending' || !decision || decision === 'pending')) {
    errors.push(`${id}: promoted proposal needs reviewer and decision`);
  }
  if (/(auto-promote|autopromote|self-approved|self approved)/i.test(block)) {
    errors.push(`${id}: auto-promotion is not allowed`);
  }
  if (rawRisk.test(block)) {
    errors.push(`${id}: possible raw secret/private payload in learning queue`);
  }
}

if (errors.length) {
  console.error(`learning queue failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`learning queue ok: ${proposals.length} proposal(s), ${pending} pending review`);
