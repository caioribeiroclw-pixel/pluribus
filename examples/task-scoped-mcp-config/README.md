# Task-scoped MCP config receipt

A tiny demo for the Claude Code / MCP context-bloat complaint: MCP tools can consume context before they are used. One practical workaround is to keep a catalog of MCP server configs and start the agent with a task-specific `--mcp-config` instead of loading every server every time.

This example makes that workaround auditable. It produces:

1. a minimal Claude Code-compatible MCP config for one task; and
2. a privacy-safe receipt showing which servers were selected, which were withheld, and why.

It deliberately does **not** claim adoption. A selected MCP server is only agent-visible; a later tool-adoption receipt would still be needed to prove the agent called it.

## Run it

```bash
cd examples/task-scoped-mcp-config
node select-mcp-config.mjs \
  --task tasks/browser-debug.json \
  --out /tmp/browser-debug.mcp.json \
  --receipt /tmp/browser-debug.receipt.json
```

Use the generated config with Claude Code or a compatible client:

```bash
claude --mcp-config /tmp/browser-debug.mcp.json
```

The demo catalog includes five plausible MCP servers. The `browser-debug` task selects only `playwright` and `context7`, withholding memory, observability, and repo-operation servers for the first pass.

## Receipt shape

The receipt is intentionally low-cardinality:

```json
{
  "schema": "pluribus.task_scoped_mcp_config_receipt.v1",
  "task_id": "browser-debug",
  "selected_server_ids": ["playwright", "context7"],
  "withheld_server_ids": ["sentry", "openmemory", "github"],
  "selected_estimated_schema_tokens": 20000,
  "withheld_estimated_schema_tokens": 24000,
  "raw_tool_schemas_logged": false,
  "adoption_claim_allowed": false
}
```

Use it to review the initial context surface:

- Did this task need every MCP server, or only a small subset?
- Which server descriptions were kept out of the first context window?
- Are we accidentally claiming “the agent used the tool” when we only proved “the tool was selected into the config”?

## Why this exists

The market signal is not “MCP is bad.” It is that large tool catalogs need two separate proofs:

- **Surface proof:** which tools/servers were made visible for this task?
- **Adoption proof:** which visible tools were actually called, cited, or used before claims/edits?

This demo covers only the first proof. Pair it with a tool-adoption receipt when you need the second.
