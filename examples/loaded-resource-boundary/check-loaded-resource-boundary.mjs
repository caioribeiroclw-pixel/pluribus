#!/usr/bin/env node
import fs from 'node:fs';

const file = process.argv[2] ?? new URL('./loaded-resource-boundary.json', import.meta.url);
const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = (message) => {
  console.error(`loaded-resource boundary invalid: ${message}`);
  process.exit(1);
};

if (receipt.receipt_type !== 'pluribus.loaded_resource_boundary.v1') fail('unexpected receipt_type');
if (!Array.isArray(receipt.expected_resources) || receipt.expected_resources.length === 0) fail('expected_resources must be non-empty');
if (!Array.isArray(receipt.sessions) || receipt.sessions.length < 2) fail('sessions must include at least two runtimes for parity checks');

const expectedIds = new Set(receipt.expected_resources.map((resource) => resource.id));
const requiredIds = new Set(receipt.expected_resources.filter((resource) => resource.required !== false).map((resource) => resource.id));
for (const resource of receipt.expected_resources) {
  if (!resource.id || !resource.kind || !resource.source_ref || !resource.source_hash?.startsWith('sha256:')) {
    fail(`expected resource ${resource.id ?? '<missing>'} needs id, kind, source_ref, and sha256 source_hash`);
  }
}

const allowedSkipReasons = new Set([
  'not_discovered',
  'not_attached_to_agent',
  'runtime_does_not_inject_resources',
  'trigger_not_matched',
  'resource_read_failed'
]);

let mismatches = 0;
for (const session of receipt.sessions) {
  for (const key of ['runtime', 'client', 'agent']) {
    if (!session[key]) fail(`session ${session.session_id ?? '<missing>'} missing ${key}`);
  }
  for (const listName of ['discovered_resources', 'attached_resources', 'injected_resources', 'readable_resources', 'skipped_resources']) {
    if (!Array.isArray(session[listName])) fail(`${session.session_id}: ${listName} must be an array`);
  }

  const stageSets = {
    discovered: new Set(session.discovered_resources),
    attached: new Set(session.attached_resources),
    injected: new Set(session.injected_resources),
    readable: new Set(session.readable_resources)
  };
  const skipped = new Map(session.skipped_resources.map((skip) => [skip.id, skip]));

  for (const id of expectedIds) {
    if (stageSets.readable.has(id)) continue;
    const skip = skipped.get(id);
    if (!skip) {
      if (requiredIds.has(id)) fail(`${session.session_id}: ${id} is required, not readable, and has no skipped_resources entry`);
      continue;
    }
    if (!allowedSkipReasons.has(skip.reason)) fail(`${session.session_id}: ${id} has unknown skip reason ${skip.reason}`);
    if (!skip.stage) fail(`${session.session_id}: ${id} skip entry needs a stage`);
    if (requiredIds.has(id)) mismatches += 1;
  }
}

if (receipt.safe_to_continue !== false && mismatches > 0) {
  fail('safe_to_continue must be false when expected resources are missing or skipped');
}

console.log(`loaded-resource boundary ok: ${mismatches} required resource/runtime gaps recorded`);
