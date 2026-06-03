#!/usr/bin/env node
import fs from 'node:fs';

const file = process.argv[2] || 'phase-boundary-contract.json';
const contract = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];

const phases = ['explore', 'propose', 'spec', 'design', 'tasks', 'apply', 'verify'];
const hashRe = /^sha256:[a-f0-9]{64}$/;
const unsafeRefRe = /(^\/|\.\.|[A-Za-z]:\\|secret|token|password|private_key)/i;
const requiredGateKeys = ['changed_files', 'tests_run', 'open_risks', 'stop_conditions'];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

expect(contract.schema === 'pluribus.phase-boundary-contract.v1', 'schema must be pluribus.phase-boundary-contract.v1');
expect(typeof contract.workflowId === 'string' && contract.workflowId.length >= 6, 'workflowId is required');
expect(phases.includes(contract.currentPhase), 'currentPhase must be a known phase');
expect(phases.includes(contract.nextPhase), 'nextPhase must be a known phase');
expect(contract.currentPhase !== contract.nextPhase, 'currentPhase and nextPhase must differ');

expect(Array.isArray(contract.allowedInput) && contract.allowedInput.length > 0, 'allowedInput must list at least one source');
for (const [index, input] of (contract.allowedInput || []).entries()) {
  expect(typeof input.kind === 'string' && input.kind.length > 0, `allowedInput[${index}].kind is required`);
  expect(typeof input.ref === 'string' && !unsafeRefRe.test(input.ref), `allowedInput[${index}].ref must be a non-secret relative/logical ref`);
  expect(hashRe.test(input.contentHash || ''), `allowedInput[${index}].contentHash must be sha256:<64 hex>`);
}

expect(contract.outputArtifact && typeof contract.outputArtifact.kind === 'string', 'outputArtifact.kind is required');
expect(contract.outputArtifact && typeof contract.outputArtifact.ref === 'string' && !unsafeRefRe.test(contract.outputArtifact.ref), 'outputArtifact.ref must be a non-secret logical ref');
expect(contract.outputArtifact && hashRe.test(contract.outputArtifact.contentHash || ''), 'outputArtifact.contentHash must be sha256:<64 hex>');

const gate = contract.evidenceGate || {};
expect(gate.status === 'pass' || gate.status === 'needs_review' || gate.status === 'fail', 'evidenceGate.status must be pass, needs_review, or fail');
expect(Array.isArray(gate.requiredBeforeNextPhase), 'evidenceGate.requiredBeforeNextPhase must be an array');
for (const key of requiredGateKeys) {
  expect((gate.requiredBeforeNextPhase || []).includes(key), `evidenceGate.requiredBeforeNextPhase must include ${key}`);
}
expect(gate.changedFiles && Number.isInteger(gate.changedFiles.count) && gate.changedFiles.count >= 0, 'evidenceGate.changedFiles.count is required');
expect(gate.changedFiles && hashRe.test(gate.changedFiles.fileSetHash || ''), 'evidenceGate.changedFiles.fileSetHash must be sha256:<64 hex>');
expect(Array.isArray(gate.testsRun), 'evidenceGate.testsRun must be an array');
for (const [index, test] of (gate.testsRun || []).entries()) {
  expect(typeof test.name === 'string' && test.name.length > 0, `testsRun[${index}].name is required`);
  expect(hashRe.test(test.commandHash || ''), `testsRun[${index}].commandHash must be sha256:<64 hex>`);
  expect(['pass', 'fail', 'skipped'].includes(test.status), `testsRun[${index}].status must be pass/fail/skipped`);
}
expect(Array.isArray(gate.openRisks), 'evidenceGate.openRisks must be an array');
for (const [index, risk] of (gate.openRisks || []).entries()) {
  expect(typeof risk.riskClass === 'string' && risk.riskClass.length > 0, `openRisks[${index}].riskClass is required`);
  expect(['low', 'medium', 'high'].includes(risk.severity), `openRisks[${index}].severity must be low/medium/high`);
  expect(typeof risk.safeToContinue === 'boolean', `openRisks[${index}].safeToContinue must be boolean`);
}

expect(Array.isArray(contract.droppedContext), 'droppedContext must be an array');
for (const [index, dropped] of (contract.droppedContext || []).entries()) {
  expect(typeof dropped.kind === 'string' && dropped.kind.length > 0, `droppedContext[${index}].kind is required`);
  expect(typeof dropped.reason === 'string' && dropped.reason.length > 0, `droppedContext[${index}].reason is required`);
}
expect(Array.isArray(contract.stopConditions), 'stopConditions must be an array');

if (gate.status === 'pass') {
  expect((contract.stopConditions || []).length === 0, 'pass contracts must not have active stopConditions');
  expect((gate.openRisks || []).every((risk) => risk.safeToContinue), 'pass contracts require all open risks to be safeToContinue');
}

if (errors.length) {
  console.error(`phase-boundary contract failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`phase-boundary contract ok: ${contract.workflowId} ${contract.currentPhase}->${contract.nextPhase}`);
