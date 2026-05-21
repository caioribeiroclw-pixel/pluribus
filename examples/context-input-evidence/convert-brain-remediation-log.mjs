#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ? resolve(process.argv[2]) : join(here, 'sample-brain-remediation-log.jsonl');
const receiptPath = process.argv[3] ? resolve(process.argv[3]) : join(here, 'brain-remediation-receipt.ndjson');
const tracePath = process.argv[4] ? resolve(process.argv[4]) : join(here, 'brain-remediation-otel-trace.json');

function sha256(value) {
  return `sha256:${createHash('sha256').update(value ?? '').digest('hex')}`;
}

function hashRef(value) {
  return sha256(value ?? '').slice(0, 19);
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
  if (typeof value === 'string') {
    if (value === 'true' || value === 'false') return { boolValue: value === 'true' };
    if (/^-?\d+$/.test(value)) return { intValue: value };
    return { stringValue: value };
  }
  if (value == null) return { stringValue: '' };
  return { stringValue: JSON.stringify(value) };
}

function attributesToOtel(attributes) {
  return Object.entries(attributes).map(([key, value]) => ({ key, value: otelValue(value) }));
}

function dollarBucket(value) {
  if (value === 0) return 'zero';
  if (value < 1) return 'under_1_usd';
  if (value < 5) return 'under_5_usd';
  return 'over_5_usd';
}

function scoreBucket(value) {
  if (value >= 90) return 'healthy';
  if (value >= 75) return 'needs_attention';
  if (value >= 50) return 'degraded';
  return 'critical';
}

const records = readJsonl(inputPath);
const start = records.find((record) => record.type === 'brain.doctor.start');
const precheck = records.find((record) => record.type === 'brain.doctor.precheck');
const plan = records.find((record) => record.type === 'brain.remediation.plan');
const jobs = records.filter((record) => record.type === 'brain.remediation.job');
const postcheck = records.find((record) => record.type === 'brain.doctor.postcheck');
const completed = records.find((record) => record.type === 'brain.doctor.completed');

if (!start || !precheck || !plan || !postcheck || !completed) {
  throw new Error(`Expected start, precheck, plan, postcheck, and completed records in ${inputPath}`);
}

const traceSeed = `${start.instance_id}:${start.run_id}:brain-remediation`;
const traceId = sha256(traceSeed).replace('sha256:', '').slice(0, 32);
const spanId = sha256(`${traceSeed}:span`).replace('sha256:', '').slice(0, 16);
const instanceHash = hashRef(start.instance_id);
const runHash = hashRef(start.run_id);
const protectedPhases = start.protected_phases ?? [];

const precheckEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'brain.doctor.precheck.completed',
  time: precheck.time,
  attributes: {
    'brain.instance.id_hash': instanceHash,
    'brain.doctor.run.id_hash': runHash,
    'brain.doctor.mode': start.mode ?? 'doctor.remediate',
    'brain.doctor.score.before': precheck.score,
    'brain.doctor.score.before_bucket': scoreBucket(precheck.score),
    'brain.doctor.issue.count.before': precheck.issue_count,
    'brain.doctor.issue.categories_hash': sha256((precheck.issue_categories ?? []).join('\n')),
    'brain.doctor.snapshot.before_hash': hashRef(precheck.brain_snapshot),
    'brain.privacy.raw_brain_recorded': 'false',
    'brain.privacy.raw_issue_recorded': 'false'
  }
};

const planEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'brain.doctor.remediation.plan.selected',
  time: plan.time,
  attributes: {
    'brain.instance.id_hash': instanceHash,
    'brain.doctor.run.id_hash': runHash,
    'brain.remediation.plan.id_hash': hashRef(plan.plan_id),
    'brain.remediation.plan.summary_hash': sha256(plan.plan_summary ?? ''),
    'brain.remediation.plan.step_count': plan.step_count ?? jobs.length,
    'brain.remediation.plan.estimated_spend_bucket': dollarBucket(plan.estimated_usd ?? 0),
    'brain.remediation.plan.expected_score_delta': plan.expected_score_delta ?? 0,
    'brain.remediation.plan.requires_protected_phase': String(Boolean(plan.requires_protected_phase)),
    'brain.remediation.protected_phases_hash': sha256(protectedPhases.join('\n')),
    'brain.privacy.raw_plan_recorded': 'false'
  }
};

const jobEvents = jobs.map((job) => ({
  trace_id: traceId,
  span_id: spanId,
  name: 'brain.doctor.remediation.job.evaluated',
  time: job.time,
  attributes: {
    'brain.instance.id_hash': instanceHash,
    'brain.doctor.run.id_hash': runHash,
    'brain.remediation.job.id_hash': hashRef(job.job_id),
    'brain.remediation.job.kind': job.step_kind ?? 'unknown',
    'brain.remediation.job.status': job.status ?? 'unknown',
    'brain.remediation.job.protected_phase': String(Boolean(job.protected_phase)),
    'brain.remediation.job.estimated_spend_bucket': dollarBucket(job.estimated_usd ?? 0),
    'brain.remediation.job.actual_spend_bucket': dollarBucket(job.actual_usd ?? 0),
    'brain.remediation.job.changed_entity_count': job.changed_entity_count ?? 0,
    'brain.remediation.job.refusal_reason': job.refusal_reason ?? '',
    'brain.remediation.job.skip_reason': job.skip_reason ?? '',
    'brain.privacy.raw_change_recorded': 'false'
  }
}));

const completedEvent = {
  trace_id: traceId,
  span_id: spanId,
  name: 'brain.doctor.remediation.completed',
  time: completed.time,
  attributes: {
    'brain.instance.id_hash': instanceHash,
    'brain.doctor.run.id_hash': runHash,
    'brain.doctor.outcome': completed.outcome ?? 'unknown',
    'brain.doctor.target_score': completed.target_score ?? start.target_score,
    'brain.doctor.score.before': completed.score_before ?? precheck.score,
    'brain.doctor.score.after': completed.score_after ?? postcheck.score,
    'brain.doctor.score.after_bucket': scoreBucket(completed.score_after ?? postcheck.score),
    'brain.doctor.target_reached': String((completed.score_after ?? postcheck.score) >= (completed.target_score ?? start.target_score ?? 0)),
    'brain.doctor.issue.count.after': postcheck.issue_count,
    'brain.doctor.issue.categories_after_hash': sha256((postcheck.issue_categories ?? []).join('\n')),
    'brain.doctor.snapshot.after_hash': hashRef(postcheck.brain_snapshot),
    'brain.remediation.jobs.submitted': completed.jobs_submitted ?? jobs.filter((job) => job.status === 'submitted').length,
    'brain.remediation.jobs.skipped': completed.jobs_skipped ?? jobs.filter((job) => job.status === 'skipped').length,
    'brain.remediation.jobs.refused': completed.jobs_refused ?? jobs.filter((job) => job.status === 'refused').length,
    'brain.remediation.cost.cap_bucket': dollarBucket(completed.max_usd ?? start.max_usd ?? 0),
    'brain.remediation.cost.actual_bucket': dollarBucket(completed.actual_usd ?? 0),
    'brain.privacy.raw_brain_recorded': 'false',
    'brain.privacy.raw_operator_note_recorded': 'false'
  }
};

const events = [precheckEvent, planEvent, ...jobEvents, completedEvent]
  .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
writeFileSync(receiptPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);

const eventTimes = records.map((record) => Date.parse(record.time)).filter(Number.isFinite);
const startTimeMs = Number.isFinite(Date.parse(start.time)) ? Date.parse(start.time) : Math.min(...eventTimes);
const endTimeMs = Number.isFinite(Date.parse(completed.time)) ? Date.parse(completed.time) : Math.max(...eventTimes) + 1;

const otlpTrace = {
  resourceSpans: [
    {
      resource: {
        attributes: attributesToOtel({
          'service.name': 'pluribus-brain-remediation-receipt-demo',
          'service.version': '0.0.0-fixture',
          'deployment.environment.name': 'local-fixture'
        })
      },
      scopeSpans: [
        {
          scope: {
            name: 'pluribus.context_input_evidence.brain_remediation_demo',
            version: '0.0.0-fixture'
          },
          spans: [
            {
              traceId,
              spanId,
              parentSpanId: '',
              name: 'agent.memory.doctor',
              kind: 1,
              startTimeUnixNano: `${BigInt(startTimeMs) * 1_000_000n}`,
              endTimeUnixNano: `${BigInt(endTimeMs) * 1_000_000n}`,
              attributes: attributesToOtel({
                'brain.instance.id_hash': instanceHash,
                'brain.doctor.run.id_hash': runHash,
                'brain.doctor.mode': start.mode ?? 'doctor.remediate',
                'brain.doctor.target_score': start.target_score ?? 0,
                'brain.remediation.cost.cap_bucket': dollarBucket(start.max_usd ?? 0),
                'brain.remediation.job.count': jobs.length
              }),
              events: events.map((event) => ({
                name: event.name,
                timeUnixNano: unixNano(event.time),
                attributes: attributesToOtel(event.attributes)
              }))
            }
          ]
        }
      ]
    }
  ]
};

writeFileSync(tracePath, `${JSON.stringify(otlpTrace, null, 2)}\n`);

console.log(JSON.stringify({
  schema: 'pluribus.contextInputEvidence.brainRemediationReceiptDemo.v0',
  inputPath,
  receiptPath,
  tracePath,
  instanceHash,
  runHash,
  eventCount: events.length,
  jobEvents: jobEvents.length,
  outcome: completed.outcome,
  rawPayloadRecorded: false
}, null, 2));
