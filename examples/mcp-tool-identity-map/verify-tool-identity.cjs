#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');

function usage() {
  console.error('usage: node verify-tool-identity.js identity-map.json tool-events.jsonl');
  process.exit(2);
}

const [identityPath, eventsPath] = process.argv.slice(2);
if (!identityPath || !eventsPath) usage();

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256ToolDefinition(definition) {
  return `sha256:${crypto.createHash('sha256').update(stable(definition)).digest('hex')}`;
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function readJsonl(path) {
  return fs.readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return { line: index + 1, value: JSON.parse(line) };
      } catch (error) {
        throw new Error(`${path}:${index + 1}: invalid JSON: ${error.message}`);
      }
    });
}

const identity = readJson(identityPath);
const entries = new Map();
const failures = [];

for (const entry of identity.tools || []) {
  if (!entry.exposed_alias) failures.push('identity entry missing exposed_alias');
  if (entries.has(entry.exposed_alias)) failures.push(`duplicate exposed_alias ${entry.exposed_alias}`);
  if (entry.tool_definition) {
    const actualHash = sha256ToolDefinition(entry.tool_definition);
    if (actualHash !== entry.tool_definition_hash) {
      failures.push(`${entry.exposed_alias}: tool_definition_hash mismatch: expected ${entry.tool_definition_hash}, computed ${actualHash}`);
    }
  }
  entries.set(entry.exposed_alias, entry);
}

for (const { line, value: event } of readJsonl(eventsPath)) {
  const aliases = [];
  if (event.exposed_alias) aliases.push(event);
  for (const surfaced of event.surfaced || []) aliases.push(surfaced);

  for (const seen of aliases) {
    const entry = entries.get(seen.exposed_alias);
    if (!entry) {
      failures.push(`${eventsPath}:${line}: unknown alias ${seen.exposed_alias}`);
      continue;
    }
    for (const field of ['source_server', 'profile', 'upstream_tool_name', 'tool_definition_hash']) {
      if (seen[field] !== undefined && seen[field] !== entry[field]) {
        failures.push(`${eventsPath}:${line}: ${seen.exposed_alias} ${field} drift: saw ${seen[field]}, identity map has ${entry[field]}`);
      }
    }
  }
}

if (failures.length) {
  console.error('tool identity receipt failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`tool identity receipt ok: ${entries.size} aliases verified against ${eventsPath}`);
