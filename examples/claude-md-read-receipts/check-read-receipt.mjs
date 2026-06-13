#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const VALID_STATES = new Set(['fresh', 'compacted', 'topic_switched', 'resumed']);
const REGROUNDING_STATES = new Set(['compacted', 'topic_switched', 'resumed']);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--receipt') { args.receipt = value; i += 1; continue; }
    if (key === '--help' || key === '-h') { args.help = true; continue; }
    throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function usage() {
  return 'Usage: node check-read-receipt.mjs --receipt sample-read-receipt.json\n';
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validate(receipt) {
  const errors = [];
  const warnings = [];

  if (receipt.schema !== 'pluribus.claude_md_read_receipt.v1') {
    errors.push('schema must be pluribus.claude_md_read_receipt.v1');
  }
  if (!VALID_STATES.has(receipt.session_state)) {
    errors.push(`session_state must be one of: ${[...VALID_STATES].join(', ')}`);
  }
  if (!hasText(receipt.current_task)) {
    errors.push('current_task is required');
  }

  const reloadedFiles = asArray(receipt.reloaded_files);
  if (reloadedFiles.length === 0) {
    errors.push('reloaded_files must name at least one file/source');
  }
  for (const [index, file] of reloadedFiles.entries()) {
    if (!hasText(file.path)) errors.push(`reloaded_files[${index}].path is required`);
    if (!hasText(file.why)) errors.push(`reloaded_files[${index}].why is required`);
  }

  const activeConstraints = asArray(receipt.active_constraints).filter(hasText);
  if (activeConstraints.length < 3) {
    errors.push('active_constraints must include at least 3 concrete constraints');
  }

  if (!Array.isArray(receipt.not_loaded_files)) {
    errors.push('not_loaded_files must be present as an array; use [] only when nothing relevant was skipped');
  } else {
    for (const [index, file] of receipt.not_loaded_files.entries()) {
      if (!hasText(file.path)) errors.push(`not_loaded_files[${index}].path is required`);
      if (!hasText(file.why)) errors.push(`not_loaded_files[${index}].why is required`);
    }
  }

  const routerLoaded = reloadedFiles.some((file) => /(^|\/)CLAUDE\.md$/i.test(file.path || '') || /router|index/i.test(file.role || ''));
  if (!routerLoaded) warnings.push('no CLAUDE.md/router/index source named in reloaded_files');

  const topicAuthorityLoaded = reloadedFiles.some((file) => /topic|authority|migration|spec|docs?\//i.test(`${file.role || ''} ${file.path || ''}`));
  if (REGROUNDING_STATES.has(receipt.session_state) && !topicAuthorityLoaded) {
    errors.push(`${receipt.session_state} receipts must name a topic authority/spec/doc reloaded after the boundary`);
  }

  if (receipt.safe_to_edit === true && errors.length > 0) {
    warnings.push('safe_to_edit=true is ignored because the receipt failed validation');
  }
  if (typeof receipt.safe_to_edit !== 'boolean') {
    errors.push('safe_to_edit must be a boolean');
  }

  const safeToEdit = errors.length === 0 && receipt.safe_to_edit === true;
  return {
    schema: 'pluribus.claude_md_read_receipt_check.v1',
    source_receipt_schema: receipt.schema || null,
    session_state: receipt.session_state || null,
    current_task_present: hasText(receipt.current_task),
    reloaded_files_count: reloadedFiles.length,
    active_constraints_count: activeConstraints.length,
    skipped_relevant_files_count: Array.isArray(receipt.not_loaded_files) ? receipt.not_loaded_files.length : null,
    router_or_index_named: routerLoaded,
    topic_authority_named: topicAuthorityLoaded,
    stale_notes_named: asArray(receipt.stale_or_historical_notes).length,
    errors,
    warnings,
    safe_to_edit: safeToEdit
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(usage()); return; }
  if (!args.receipt) throw new Error(usage().trim());

  const receiptPath = path.resolve(args.receipt);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const result = validate(receipt);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.safe_to_edit) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
