#!/usr/bin/env node
import fs from 'node:fs';

const args = process.argv.slice(2);
const receiptPath = args[args.indexOf('--receipt') + 1];
if (!receiptPath || args.indexOf('--receipt') === -1) {
  console.error('Usage: node check-degradation-receipt.mjs --receipt <path>');
  process.exit(2);
}

const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
const errors = [];
const gates = new Set(['continue', 'read_only', 'fallback_model', 'pause_writes', 'stop']);
const confidences = new Set(['healthy', 'provider_degraded', 'app_bug', 'network', 'unknown']);

function requireString(field) {
  if (!receipt[field] || typeof receipt[field] !== 'string') errors.push(`${field} must be a non-empty string`);
}

if (receipt.schema !== 'pluribus.provider_degradation_decision.v1') {
  errors.push('schema must be pluribus.provider_degradation_decision.v1');
}
for (const field of ['run_id', 'provider', 'model', 'region', 'prompt_template_hash', 'canary_suite_version']) {
  requireString(field);
}
if (!String(receipt.prompt_template_hash || '').startsWith('sha256:')) {
  errors.push('prompt_template_hash must be a sha256: digest');
}
if (!gates.has(receipt.write_gate)) errors.push(`write_gate must be one of ${[...gates].join(', ')}`);
if (!confidences.has(receipt.confidence)) errors.push(`confidence must be one of ${[...confidences].join(', ')}`);

const t = receipt.transport || {};
for (const [field, limit] of Object.entries({ window_minutes: 1, ttft_p95_ms: 0, total_latency_p95_ms: 0, timeout_rate: 0, error_rate: 0, retry_count: 0 })) {
  if (typeof t[field] !== 'number' || t[field] < limit) errors.push(`transport.${field} must be a number >= ${limit}`);
}
if (t.timeout_rate > 1 || t.error_rate > 1) errors.push('transport timeout/error rates must be <= 1');

if (!Array.isArray(receipt.capability_canaries) || receipt.capability_canaries.length < 3) {
  errors.push('capability_canaries must include at least three app-critical canaries');
}
const canaries = receipt.capability_canaries || [];
const required = ['json_schema', 'tool_choice', 'patch_format'];
for (const name of required) {
  if (!canaries.some((c) => c.name === name)) errors.push(`missing required canary: ${name}`);
}
const failingWriteBlockers = canaries.filter((c) => c.status === 'fail' && c.severity === 'write_blocking');
const degradedTransport = t.timeout_rate >= 0.05 || t.error_rate >= 0.05 || t.ttft_p95_ms >= 5000 || t.total_latency_p95_ms >= 30000;
if (degradedTransport && receipt.confidence === 'healthy') {
  errors.push('confidence cannot be healthy when transport degradation thresholds are exceeded');
}
if (failingWriteBlockers.length > 0 && ['continue'].includes(receipt.write_gate)) {
  errors.push(`write_gate cannot be continue when write-blocking canaries fail: ${failingWriteBlockers.map((c) => c.name).join(', ')}`);
}
if (receipt.confidence === 'provider_degraded' && receipt.write_gate === 'continue' && !receipt.fallback?.chosen) {
  errors.push('provider_degraded decisions must choose fallback or block writes instead of continue');
}

if (errors.length) {
  console.error(`Degradation receipt failed (${receiptPath}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Degradation receipt passed: ${receiptPath}`);
