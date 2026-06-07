# MCP telemetry import demo

This example converts a tiny MCP `rpc-messages.jsonl`-style trace into the same privacy-safe audit receipt shape used by `pluribus demo mcp-audit-receipt`.

Run from any directory after `pluribus-context@latest` includes this demo:

```bash
npx --yes pluribus-context@latest demo mcp-telemetry-import
npx --yes pluribus-context@latest demo mcp-telemetry-import --json
```

Or convert your own log:

```bash
npx --yes pluribus-context@latest demo mcp-telemetry-import --input ./rpc-messages.jsonl --json
```

The point is not to store raw MCP payloads forever. The import keeps only:

- request/session IDs;
- hashed user/token subjects;
- token scopes;
- tool name;
- redacted argument/result shape;
- status, duration if timestamps exist, and error class.

If only fallback `rpc-messages.jsonl` exists, the receipt can still prove tool-call attribution. If gateway telemetry is absent, latency/status coverage should be marked as a gap instead of silently implied.
