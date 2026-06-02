#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || new URL('.', import.meta.url).pathname;
const envelopePath = path.join(dir, 'denial-envelope.json');
const auditPath = path.join(dir, 'operator-audit-record.json');
const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const errors = [];

const secretLike = /(api[_-]?key|secret|password|token\s*[:=]|-----BEGIN|bearer\s+[a-z0-9._-]+|raw transcript|verbatim customer|full email)/i;
const rawCommandLike = /\b(rm\s+-rf|git\s+push|git\s+reset|npm\s+publish|curl\s+https?:|gh\s+(issue|pr)\s+(create|edit))\b/i;
const absolutePathLike = /(^|["'\s])\/(home|Users|var|etc|tmp)\/[\w./-]+/i;
const sha256Like = /^sha256:[a-f0-9]{64}$/;
const allowedReasonClasses = new Set([
  'destructive_git',
  'filesystem_write_out_of_scope',
  'outbound_after_secret_read',
  'credential_exposure_risk',
  'package_publish_requires_approval',
  'unknown_policy_boundary'
]);
const retrySafety = new Set(['safe_to_retry', 'unsafe_until_approved', 'unsafe_do_not_retry']);

function requireString(object, field, label) {
  if (typeof object[field] !== 'string' || object[field].trim() === '') {
    errors.push(`${label}: missing ${field}`);
    return '';
  }
  return object[field];
}

function inspectModelVisible(value, prefix = 'envelope') {
  if (typeof value === 'string') {
    if (secretLike.test(value)) errors.push(`${prefix}: possible secret/private payload leak`);
    if (rawCommandLike.test(value)) errors.push(`${prefix}: raw command leaked to model-visible denial`);
    if (absolutePathLike.test(value)) errors.push(`${prefix}: absolute private path leaked to model-visible denial`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectModelVisible(item, `${prefix}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (/raw(command|input|prompt|policy|file|content)|secret|token|password/i.test(key)) {
        errors.push(`${prefix}.${key}: forbidden model-visible field`);
      }
      inspectModelVisible(item, `${prefix}.${key}`);
    }
  }
}

if (envelope.type !== 'agent_firewall_denial.v1') errors.push('envelope: wrong type');
if (audit.type !== 'agent_firewall_operator_audit.v1') errors.push('audit: wrong type');
if (envelope.decision !== 'blocked') errors.push('envelope: decision must be blocked');
if (audit.decision !== 'blocked') errors.push('audit: decision must be blocked');

const correlationId = requireString(envelope, 'correlationId', 'envelope');
if (correlationId !== audit.correlationId) errors.push('audit: correlationId does not match envelope');

const reasonClass = requireString(envelope, 'reasonClass', 'envelope');
if (reasonClass && !allowedReasonClasses.has(reasonClass)) {
  errors.push(`envelope: unknown or too-specific reasonClass ${reasonClass}`);
}

const alternative = requireString(envelope, 'safeAlternative', 'envelope');
if (alternative.length > 240) errors.push('envelope: safeAlternative should stay short');
if (typeof envelope.requiresApproval !== 'boolean') errors.push('envelope: requiresApproval must be boolean');
if (!retrySafety.has(envelope.retrySafety)) errors.push('envelope: invalid retrySafety');
inspectModelVisible(envelope);

if (!['Bash', 'Edit', 'Write', 'WebFetch', 'MCP', 'Task', 'Agent'].includes(audit.tool)) {
  errors.push('audit: unexpected or missing tool class');
}
if (!sha256Like.test(audit.commandHash || '')) errors.push('audit: commandHash must be sha256:<64 hex>');
if (!sha256Like.test(audit.cwdHash || '')) errors.push('audit: cwdHash must be sha256:<64 hex>');
if (!Array.isArray(audit.matchedPolicyIds) || audit.matchedPolicyIds.length === 0) {
  errors.push('audit: matchedPolicyIds must be a non-empty array');
}
if (!audit.sessionTaint || typeof audit.sessionTaint !== 'object') errors.push('audit: missing sessionTaint object');
if (!audit.approval || typeof audit.approval !== 'object') errors.push('audit: missing approval object');
if (!retrySafety.has(audit.retrySafety)) errors.push('audit: invalid retrySafety');
if (typeof audit.modelEnvelopeHash !== 'string' || !sha256Like.test(audit.modelEnvelopeHash)) {
  errors.push('audit: modelEnvelopeHash must be sha256:<64 hex>');
}

function inspectAuditValues(value, prefix = 'audit') {
  if (typeof value === 'string') {
    if (/(api[_-]?key\s*[:=]|secret\s*[:=]|password\s*[:=]|token\s*[:=]|-----BEGIN|bearer\s+[a-z0-9._-]+|raw transcript|verbatim customer|full email)/i.test(value)) {
      errors.push(`${prefix}: possible raw secret/private payload`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectAuditValues(item, `${prefix}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) inspectAuditValues(item, `${prefix}.${key}`);
  }
}

inspectAuditValues(audit);
if ('rawCommand' in audit || 'rawPrompt' in audit || 'rawPolicy' in audit || 'rawFileContent' in audit) {
  errors.push('audit: raw private payload fields are not allowed');
}

if (errors.length) {
  console.error(`agent firewall denial/audit failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`agent firewall denial/audit ok: ${correlationId}, ${reasonClass}, ${audit.matchedPolicyIds.length} policy id(s)`);
