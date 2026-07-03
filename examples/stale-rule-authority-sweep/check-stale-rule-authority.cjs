#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SCHEMA = 'pluribus.stale_rule_authority_sweep.v1';
const VALID_AUTHORITY = new Set(['current', 'historical', 'candidate']);
const CONTEXT_FILE_EVIDENCE = new Set(['context_file', 'instruction_file', 'claude_md', 'agents_md']);

function usage() {
  return 'usage: node check-stale-rule-authority.cjs rules.json [--today YYYY-MM-DD]';
}

function parseArgs(argv) {
  const args = { input: null, today: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--today') {
      args.today = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (!args.input) {
      args.input = arg;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.input) throw new Error(usage());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.today)) throw new Error('--today must be YYYY-MM-DD');
  return args;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isExpired(date, today) {
  return hasText(date) && date < today;
}

function validate(receipt, today) {
  const errors = [];
  const warnings = [];

  if (receipt.schema !== SCHEMA) errors.push(`schema must be ${SCHEMA}`);
  if (!hasText(receipt.rule_file)) errors.push('rule_file is required');
  if (!hasText(receipt.checked_at_ref)) errors.push('checked_at_ref is required');
  if (!Array.isArray(receipt.rules) || receipt.rules.length === 0) errors.push('rules must be a non-empty array');

  const ids = new Set();
  const rules = Array.isArray(receipt.rules) ? receipt.rules : [];

  for (const [index, rule] of rules.entries()) {
    const label = hasText(rule.id) ? rule.id : `rules[${index}]`;
    if (!hasText(rule.id)) errors.push(`${label}: id is required`);
    if (ids.has(rule.id)) errors.push(`${label}: duplicate id`);
    if (hasText(rule.id)) ids.add(rule.id);
    if (!hasText(rule.statement)) errors.push(`${label}: statement is required`);
    if (!hasText(rule.owner)) errors.push(`${label}: owner is required`);
    if (!hasText(rule.source)) errors.push(`${label}: source is required`);
    if (!VALID_AUTHORITY.has(rule.authority)) errors.push(`${label}: authority must be current, historical, or candidate`);

    const evidence = rule.evidence || {};
    if (!hasText(evidence.kind)) errors.push(`${label}: evidence.kind is required`);
    if (!hasText(evidence.path)) errors.push(`${label}: evidence.path is required`);
    if (!hasText(evidence.last_result)) errors.push(`${label}: evidence.last_result is required`);
    if (!hasText(rule.last_verified)) errors.push(`${label}: last_verified is required`);
    if (!hasText(rule.revisit_after)) errors.push(`${label}: revisit_after is required`);

    const current = rule.authority === 'current';
    const contextOnly = CONTEXT_FILE_EVIDENCE.has(String(evidence.kind || '').toLowerCase()) || evidence.path === receipt.rule_file;
    if (current && contextOnly) {
      errors.push(`${label}: current rules need live evidence outside ${receipt.rule_file}`);
    }
    if (current && isExpired(rule.revisit_after, today)) {
      errors.push(`${label}: revisit_after ${rule.revisit_after} is expired for ${today}`);
    }
    if (current && /not_checked|unknown|missing|failed/i.test(String(evidence.last_result || ''))) {
      errors.push(`${label}: current rule evidence last_result is not verified (${evidence.last_result})`);
    }
    if (current && !hasText(rule.demotion_rule)) {
      errors.push(`${label}: demotion_rule is required for current rules`);
    }
    if (rule.authority === 'historical' && !/historical|previous|superseded|not authority/i.test(`${rule.statement} ${rule.demotion_rule || ''} ${evidence.last_result || ''}`)) {
      warnings.push(`${label}: historical rule should explain why it is not current authority`);
    }
  }

  return { errors, warnings };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const receipt = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const { errors, warnings } = validate(receipt, args.today);
  const rules = Array.isArray(receipt.rules) ? receipt.rules : [];
  const current = rules.filter((rule) => rule.authority === 'current').length;
  const historical = rules.filter((rule) => rule.authority === 'historical').length;

  if (errors.length) {
    console.error('stale-rule authority sweep failed');
    for (const error of errors) console.error(`- ${error}`);
    for (const warning of warnings) console.error(`warning: ${warning}`);
    process.exit(1);
  }

  console.log(`stale-rule authority sweep ok: ${rules.length} rules checked, ${current} current, ${historical} historical`);
  for (const warning of warnings) console.log(`warning: ${warning}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
