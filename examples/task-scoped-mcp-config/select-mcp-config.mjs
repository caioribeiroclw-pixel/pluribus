#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (!key.startsWith('--') || value === undefined || value.startsWith('--')) {
    throw new Error(`Expected --key value, got ${key}`);
  }
  args.set(key.slice(2), value);
  i += 1;
}

const taskPath = args.has('task') ? resolve(process.cwd(), args.get('task')) : resolve(here, 'tasks/browser-debug.json');
const catalogPath = args.has('catalog') ? resolve(process.cwd(), args.get('catalog')) : resolve(here, 'mcp-catalog.json');
const outPath = args.has('out') ? resolve(process.cwd(), args.get('out')) : null;
const receiptPath = args.has('receipt') ? resolve(process.cwd(), args.get('receipt')) : null;

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const task = JSON.parse(readFileSync(taskPath, 'utf8'));
const servers = new Map(catalog.servers.map((server) => [server.id, server]));
const missing = task.includeServerIds.filter((id) => !servers.has(id));
if (missing.length) {
  throw new Error(`Task references unknown server ids: ${missing.join(', ')}`);
}

const selected = task.includeServerIds.map((id) => servers.get(id));
const withheld = catalog.servers.filter((server) => !task.includeServerIds.includes(server.id));
const mcpServers = Object.fromEntries(
  selected.map((server) => [
    server.id,
    {
      command: server.command,
      args: server.args,
    },
  ]),
);

const config = { mcpServers };
const receipt = {
  schema: 'pluribus.task_scoped_mcp_config_receipt.v1',
  task_id: task.taskId,
  catalog_id: catalog.catalogId,
  selected_server_ids: selected.map((server) => server.id),
  withheld_server_ids: withheld.map((server) => server.id),
  selected_estimated_schema_tokens: selected.reduce((sum, server) => sum + server.estimatedSchemaTokens, 0),
  withheld_estimated_schema_tokens: withheld.reduce((sum, server) => sum + server.estimatedSchemaTokens, 0),
  selection_reason: task.description,
  withheld_reason: task.excludeReason,
  raw_tool_schemas_logged: false,
  raw_prompts_logged: false,
  raw_tool_outputs_logged: false,
  adoption_claim_allowed: false,
  note: 'This proves only the task-scoped MCP config surface. It does not prove that the agent later called or adopted the selected tools.',
};

if (outPath) writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`);
if (receiptPath) writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({ ok: true, config, receipt }, null, 2));
