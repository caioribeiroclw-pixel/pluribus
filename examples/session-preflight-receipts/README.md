# Session preflight receipt example

This example is for Cursor/Claude Code/MCP workflows where a project wants a required first step before agent work, such as `session_guard.session_init` or reading `MEMORY.md`.

It turns a behavioral instruction into a reviewable artifact:

1. The rule says the agent must initialize context first.
2. The receipt records whether the required context was loaded.
3. The decision says whether the run may proceed, must stay read-only, or should stop.

Copy the sample rule into `.cursor/rules/session-preflight.mdc` and adapt the JSON fields to your local guard/MCP server.

## Try it

```bash
node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('examples/session-preflight-receipts/session-preflight-receipt.json','utf8')); if (!r.decision.allowed_to_start_work) process.exit(1); console.log(r.schema, r.decision.mode)"
```

Expected output:

```text
pluribus.session_preflight_receipt.v1 read_then_patch
```

This does not enforce Cursor's tool calls by itself. It gives teams a concrete evidence object to ask for when evaluating required-first-tool or pre-tool-hook workflows.
