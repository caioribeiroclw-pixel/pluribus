#!/usr/bin/env node
import fs from 'node:fs';

const file = process.argv[2] || new URL('./skill-install-receipt.json', import.meta.url);
const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));

const allowedInstall = new Set(['installed', 'skipped', 'failed']);
const allowedDiscovery = new Set(['discovered', 'not_discovered', 'not_tested', 'failed']);
const allowedLoad = new Set(['injected', 'readable', 'activation_required', 'deferred', 'not_tested', 'failed']);
const allowedCost = new Set(['0-1k', '1k-5k', '5k-20k', 'over_budget', 'unknown']);
const requiredPrivacy = [
  'raw_skill_body',
  'raw_prompt',
  'transcript',
  'secrets',
  'env_dump',
  'private_absolute_path'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(receipt.receipt_type === 'agent.skill_install_receipt.v1', 'unexpected receipt_type');
assert(receipt.run_id, 'missing run_id');
assert(receipt.installer?.name, 'missing installer.name');
assert(receipt.installer?.source?.kind, 'missing installer.source.kind');
assert(receipt.installer?.source?.ref, 'missing installer.source.ref');
assert(receipt.installer.source.credentials_in_ref === false, 'source ref must not carry credentials');
assert(Array.isArray(receipt.targets) && receipt.targets.length > 0, 'targets must be a non-empty array');
assert(Array.isArray(receipt.privacy_exclusions), 'missing privacy_exclusions');

for (const item of requiredPrivacy) {
  assert(receipt.privacy_exclusions.includes(item), `privacy_exclusions must include ${item}`);
}

let computedOverallSafe = true;
for (const [index, target] of receipt.targets.entries()) {
  assert(target.agent, `targets[${index}].agent missing`);
  assert(['project', 'global', 'workspace', 'unknown'].includes(target.scope), `targets[${index}].scope invalid`);
  assert(typeof target.required === 'boolean', `targets[${index}].required must be boolean`);
  assert(allowedInstall.has(target.install_status), `targets[${index}].install_status invalid`);
  assert(allowedDiscovery.has(target.discovery_status), `targets[${index}].discovery_status invalid`);
  assert(allowedLoad.has(target.load_status), `targets[${index}].load_status invalid`);
  assert(allowedCost.has(target.context_cost_bucket), `targets[${index}].context_cost_bucket invalid`);
  assert(typeof target.safe_to_start_session === 'boolean', `targets[${index}].safe_to_start_session must be boolean`);

  if (target.evidence) {
    assert(target.evidence.raw_body_logged === false, `targets[${index}] must not log raw skill body`);
  }

  const requiredTargetUnsafe = target.required && (
    target.install_status !== 'installed' ||
    target.discovery_status !== 'discovered' ||
    target.load_status === 'failed' ||
    target.load_status === 'not_tested' ||
    target.context_cost_bucket === 'over_budget' ||
    target.safe_to_start_session !== true
  );

  if (requiredTargetUnsafe) {
    computedOverallSafe = false;
  }
}

assert(receipt.overall_safe_to_start_session === computedOverallSafe, 'overall_safe_to_start_session does not match required target safety');

const serialized = JSON.stringify(receipt).toLowerCase();
for (const forbidden of ['private_key', 'api_key=', 'ghp_', 'github_pat_', 'npm_', 'bearer ']) {
  assert(!serialized.includes(forbidden), `receipt appears to include secret marker: ${forbidden}`);
}

console.log(`skill install receipt ok: ${receipt.targets.length} targets checked`);
