#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || path.join('examples', 'parallel-session-review-ledger', 'parallel-session-review-ledger.json');
const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];

const allowedStates = new Set(['complete', 'partial', 'blocked', 'unsafe_to_resume']);
const allowedNextActions = new Set([
  'review_diff',
  'run_missing_check',
  'continue_same_scope',
  'ask_human',
  'stop_manual_review'
]);

function add(condition, message) {
  if (!condition) errors.push(message);
}

function globPrefix(pattern) {
  return pattern.replace(/\*\*.*$/, '').replace(/\*.*$/, '');
}

add(receipt.schema === 'pluribus.parallel_session_review_ledger.v1', 'schema must be pluribus.parallel_session_review_ledger.v1');
add(Array.isArray(receipt.sessions) && receipt.sessions.length > 0, 'sessions must be a non-empty array');

for (const session of receipt.sessions || []) {
  const label = session.id || '<missing-id>';
  add(Boolean(session.id), 'session id is required');
  add(Boolean(session.assignment), `${label}: assignment is required`);
  add(Boolean(session.branch), `${label}: branch is required`);
  add(Boolean(session.allowed_scope), `${label}: allowed_scope is required`);
  add(Array.isArray(session.allowed_scope?.files) && session.allowed_scope.files.length > 0, `${label}: allowed_scope.files must be non-empty`);
  add(allowedStates.has(session.state), `${label}: invalid state ${session.state}`);
  add(allowedNextActions.has(session.safe_next_action), `${label}: invalid safe_next_action ${session.safe_next_action}`);

  const evidence = session.evidence || [];
  const missingChecks = session.missing_checks || [];
  const privacyFlags = session.privacy_flags || [];

  if (session.state === 'complete') {
    add(evidence.length > 0, `${label}: complete sessions need evidence`);
    add(missingChecks.length === 0, `${label}: complete sessions cannot have missing_checks`);
    add(privacyFlags.length === 0, `${label}: complete sessions cannot have privacy_flags`);
  }

  if (session.state === 'partial') {
    add(missingChecks.length > 0, `${label}: partial sessions must name missing_checks`);
  }

  if (session.state === 'unsafe_to_resume') {
    add(session.safe_next_action === 'stop_manual_review', `${label}: unsafe_to_resume must use stop_manual_review`);
  }

  const allowedPrefixes = (session.allowed_scope?.files || []).map(globPrefix);
  for (const touched of session.touched_files || []) {
    add(allowedPrefixes.some((prefix) => touched.startsWith(prefix)), `${label}: touched file outside allowed scope: ${touched}`);
  }
}

if (errors.length > 0) {
  console.error('parallel session review ledger invalid:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`parallel session review ledger ok: ${receipt.sessions.length} sessions checked`);
