# Claude extension source-map receipts

Claude Code sessions can be changed by several extension layers: `CLAUDE.md`, output styles, skills/slash-invoked procedures, hooks, subagents, plugins, and MCP servers. When behavior is surprising, teams need a small proof of **which layer was active and what kind of authority it carried** — not a dump of raw prompts, tool schemas, or secrets.

A `claude_extension_source_map` receipt records the active extension surface with source labels:

- `official` — documented product behavior.
- `observed` — behavior seen in a trace set or local instrumentation.
- `community_claim` — useful but unverified reports.
- `practical_inference` — architecture guidance inferred from the above.

## Try it

```bash
pluribus demo claude-extension-source-map --json
```

Or validate a custom receipt:

```bash
pluribus demo claude-extension-source-map --receipt path/to/receipt.json --json
```

Bundled fixture: [`examples/claude-extension-source-map/claude-extension-source-map-receipt.json`](../examples/claude-extension-source-map/claude-extension-source-map-receipt.json)

## What the receipt proves

A compact receipt should answer:

1. Which extension layers were active? (`claude_md`, `output_style`, `skill`, `hook`, `subagent`, `plugin`, `mcp_server`)
2. What authority did each layer carry? Stable project context, response behavior, repeatable procedure, deterministic policy, isolated review, distributed bundle, or external tool/state boundary.
3. Which source label supports the claim? Official docs, observed trace, community claim, or practical inference.
4. What hashes/versions identify the source without exposing raw content?
5. Which boundary observations matter for the next action?
6. What makes the receipt stale?

## Why this is not just another context dump

A source map is useful because it separates **cause** from **content**. Reviewers do not need the full `CLAUDE.md`, skill body, hook script, MCP schema, or prompt payload in model context. They need enough evidence to decide whether a behavior came from durable project context, response style, auto-selected skill instructions, deterministic hooks, subagent delegation, a plugin bundle, or an external MCP server.

That matters most before a write or external action: if the agent is about to mutate GitHub, deploy, edit many files, send mail, or call a production MCP tool, the approval path should know which extension layers were active and which ones can invalidate the decision.
