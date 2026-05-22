#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-secret-scanning-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'secret-scanning-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'secret-scanning-otel-trace.json');

function sha256(value) {
  return `sha256:${createHash('sha256').update(value ?? '').digest('hex')}`;
}

function hashRef(value) {
  return sha256(value ?? '').slice(0, 19);
}

function hashList(values = []) {
  return sha256(values.join('\n'));
}

function readJsonl(path) {
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${path}:${index + 1}: ${error.message}`);
      }
    });
}

function unixNano(isoTimestamp) {
  return `${BigInt(Date.parse(isoTimestamp)) * 1_000_000n}`;
}

function otelValue(value) {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number' && Number.isInteger(value)) return { intValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (value == null) return { stringValue: '' };
  return { stringValue: String(value) };
}

function attributesToOtel(attributes) {
  return Object.entries(attributes).map(([key, value]) => ({ key, value: otelValue(value) }));
}

function countBucket(value) {
  if (value === 0) return 'zero';
  if (value <= 2) return 'under_2';
  if (value <= 5) return 'under_5';
  return 'over_5';
}

function lineBucket(line) {
  if (line <= 20) return '1_20';
  if (line <= 100) return '21_100';
  return 'over_100';
}

function durationBucket(ms) {
  if (ms < 1_000) return 'under_1s';
  if (ms < 10_000) return 'under_10s';
  return 'over_10s';
}

const records = readJsonl(inputPath);
const session = records.find((record) => record.type === 'session.start');
const requested = records.find((record) => record.type === 'security.secret_scanning.requested');
const completed = records.find((record) => record.type === 'security.secret_scanning.completed');
const findings = records.filter((record) => record.type === 'security.secret_scanning.finding.presented');
const bypass = records.find((record) => record.type === 'security.secret_scanning.bypass.evaluated');
const verified = records.find((record) => record.type === 'security.secret_scanning.remediation.verified');

if (!session || !requested || !completed || findings.length === 0 || !bypass || !verified) {
  throw new Error(`Expected session, secret scanning request/completion/findings/bypass/remediation records in ${inputPath}`);
}

const traceSeed = `${session.session_id}:${session.conversation_id}:secret-scanning`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);

const baseAttrs = {
  'session.id': session.session_id,
  'gen_ai.conversation.id': session.conversation_id,
  'agent.name': session.agent,
  'mcp.provider': session.provider,
  'mcp.client': session.client,
  'repository.hash': hashRef(session.repository),
  'repository.path_hash': sha256(session.repo),
};

const events = [
  {
    name: 'security.secret_scanning.requested',
    time: requested.time,
    attributes: {
      ...baseAttrs,
      'security.scan.request.hash': hashRef(requested.request_id),
      'security.scan.trigger': requested.trigger,
      'security.scan.toolset': requested.toolset,
      'security.scan.tool': requested.tool,
      'security.scan.scope': requested.scan_scope,
      'security.scan.diff_path_count': requested.diff_paths.length,
      'security.scan.diff_paths_hash': hashList(requested.diff_paths),
      'security.scan.prompt_hash': sha256(requested.prompt),
      'security.secret_scanning.push_protection_customization': requested.push_protection_customization,
      'security.secret_scanning.persisted_as_github_alert': requested.persisted_as_github_alert,
      'privacy.raw_prompt_recorded': false,
      'privacy.raw_diff_paths_recorded': false,
      'privacy.raw_secret_values_recorded': false,
    },
  },
  {
    name: 'security.secret_scanning.completed',
    time: completed.time,
    attributes: {
      ...baseAttrs,
      'security.scan.request.hash': hashRef(completed.request_id),
      'security.scan.status': completed.status,
      'security.scan.files_scanned': completed.files_scanned,
      'security.scan.line_count_bucket': countBucket(Math.ceil(completed.line_count / 100)),
      'security.secret_scanning.finding_count': completed.finding_count,
      'security.secret_scanning.finding_count_bucket': countBucket(completed.finding_count),
      'security.secret_scanning.detector_count': completed.detector_count,
      'security.secret_scanning.engine_snapshot_hash': hashRef(completed.engine_snapshot),
      'security.scan.latency_bucket': durationBucket(completed.latency_ms),
      'security.scan.tool_response_hash': sha256(completed.tool_response_excerpt),
      'privacy.raw_tool_response_recorded': false,
      'privacy.raw_secret_values_recorded': false,
    },
  },
  ...findings.map((finding) => ({
    name: 'security.secret_scanning.finding.presented',
    time: finding.time,
    attributes: {
      ...baseAttrs,
      'security.scan.request.hash': hashRef(finding.request_id),
      'security.finding.hash': hashRef(finding.finding_id),
      'security.secret_scanning.secret_type': finding.secret_type,
      'security.finding.severity': finding.severity,
      'security.finding.location_path_hash': sha256(finding.location_path),
      'security.finding.line_bucket': lineBucket(finding.line),
      'security.finding.secret_value_hash': sha256(finding.secret_value),
      'security.finding.remediation_hash': sha256(finding.remediation),
      'security.secret_scanning.push_protection_action': finding.push_protection_action,
      'security.secret_scanning.bypass_allowed': finding.bypass_allowed,
      'privacy.raw_location_path_recorded': false,
      'privacy.raw_secret_value_recorded': false,
      'privacy.raw_remediation_text_recorded': false,
    },
  })),
  {
    name: 'security.secret_scanning.bypass.evaluated',
    time: bypass.time,
    attributes: {
      ...baseAttrs,
      'security.scan.request.hash': hashRef(bypass.request_id),
      'security.policy.hash': hashRef(bypass.policy),
      'security.secret_scanning.bypass_requested': bypass.bypass_requested,
      'security.secret_scanning.bypass_allowed': bypass.bypass_allowed,
      'security.secret_scanning.bypass_reason': bypass.bypass_reason,
      'security.secret_scanning.decision': bypass.decision,
      'security.operator_note_hash': sha256(bypass.operator_note),
      'privacy.raw_operator_note_recorded': false,
    },
  },
  {
    name: 'security.secret_scanning.remediation.verified',
    time: verified.time,
    attributes: {
      ...baseAttrs,
      'security.scan.request.hash': hashRef(verified.request_id),
      'security.scan.rescan.hash': hashRef(verified.rescan_id),
      'security.scan.status': verified.status,
      'security.scan.changed_path_count': verified.changed_paths.length,
      'security.scan.changed_paths_hash': hashList(verified.changed_paths),
      'security.secret_scanning.finding_count_after': verified.finding_count_after,
      'security.remediation.rotation_ticket_hash': sha256(verified.rotation_ticket),
      'security.scan.latency_bucket': durationBucket(verified.latency_ms),
      'privacy.raw_changed_paths_recorded': false,
      'privacy.raw_rotation_ticket_recorded': false,
      'audit.gap': 'receipt_proves_scan_findings_policy_and_clean_rescan_not_secret_revocation_completion',
    },
  },
].map((event) => ({ trace_id: traceId, span_id: spanId, ...event }));

const receipt = events.map((event) => JSON.stringify(event)).join('\n') + '\n';
writeFileSync(receiptPath, receipt);

const trace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-context-input-evidence-demo',
          'service.version': '0.3.23',
        }),
      },
      scopeSpans: [
        {
          scope: { name: 'pluribus.context_input_evidence.secret_scanning', version: '0.1.0' },
          spans: [
            {
              traceId,
              spanId,
              name: 'agent.session',
              kind: 1,
              startTimeUnixNano: unixNano(session.time),
              endTimeUnixNano: unixNano(verified.time),
              attributes: attributesToOtel(baseAttrs),
              events: events.map((event) => ({
                name: event.name,
                timeUnixNano: unixNano(event.time),
                attributes: attributesToOtel(event.attributes),
              })),
            },
          ],
        },
      ],
    },
  ],
};

writeFileSync(tracePath, `${JSON.stringify(trace, null, 2)}\n`);
console.log(`wrote ${events.length} secret scanning receipt events to ${receiptPath}`);
console.log(`wrote OpenTelemetry-style trace to ${tracePath}`);
