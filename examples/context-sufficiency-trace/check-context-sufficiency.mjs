#!/usr/bin/env node
import fs from 'node:fs';

const [truthPath, tracePath] = process.argv.slice(2);
if (!truthPath || !tracePath) {
  console.error('Usage: node check-context-sufficiency.mjs <ground-truth.json> <context-trace.json>');
  process.exit(2);
}

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const truth = readJson(truthPath);
const trace = readJson(tracePath);

const required = new Set(truth.required_files || []);
const returned = new Set((trace.returned_files || []).map((file) => file.path));
const frontierCut = new Set((trace.frontier_cut || []).map((file) => file.path));
const late = new Set((trace.late_files || []).map((file) => file.path));

const requiredList = [...required];
const returnedRequired = requiredList.filter((path) => returned.has(path));
const missedRequired = requiredList.filter((path) => !returned.has(path));
const frontierCutMisses = missedRequired.filter((path) => frontierCut.has(path));
const lateMisses = missedRequired.filter((path) => late.has(path));

const ratio = (count, total) => (total === 0 ? 0 : Number((count / total).toFixed(4)));
const report = {
  task_id: truth.task_id,
  trace_id: trace.trace_id,
  required_files: requiredList.length,
  returned_files: returned.size,
  gold_context_recall: ratio(returnedRequired.length, requiredList.length),
  missed_required_file_rate: ratio(missedRequired.length, requiredList.length),
  late_context_rate: ratio(lateMisses.length, requiredList.length),
  missed_required_files: missedRequired,
  frontier_cut_misses: frontierCutMisses,
  verdict: missedRequired.length === 0 ? 'pass' : 'fail'
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.verdict === 'pass' ? 0 : 1);
