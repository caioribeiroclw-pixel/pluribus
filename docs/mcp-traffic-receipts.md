# MCP traffic receipts

MCP observability tools can sit in the real client↔server path and capture every JSON-RPC frame. That is powerful, but raw traces are usually the wrong thing to paste into an agent context window: they may include arguments, tool outputs, workspace paths, customer data, or secrets.

A Pluribus MCP traffic receipt is the small artifact that crosses the boundary instead.

## What the receipt proves

- **Observed pair:** client name/workspace hash and server name/transport/command hash.
- **Capability agreement:** hash of the initialize/capability exchange that was in force for the session.
- **Frame evidence:** frame ids, direction, kind, method, timestamps, and payload hashes — not raw payloads.
- **Tool-call outcome:** tool name, request/response frame ids, status (`ok`, `error`, `pending`, `hung`, `denied`), duration, argument hash/shape, and response hash/shape.
- **Replay evidence:** optional artifact hash for isolated replay of a captured call.
- **Privacy defaults:** raw payloads excluded; arguments and responses represented by hash or shape only.

## Minimal demo

```bash
pluribus demo mcp-traffic-receipt --json
```

Bundled fixture: [`examples/mcp-traffic-receipts/mcp-traffic-receipt.json`](../examples/mcp-traffic-receipts/mcp-traffic-receipt.json)

## Review invariant

A tool call should not become authority just because the agent claims it ran. The reviewer needs to know:

1. was the call visible on the real client↔server path?
2. did the capability agreement include that tool at the time?
3. did the response arrive, error, or hang?
4. is there replay evidence for the behavior being trusted?
5. can this be reviewed without leaking raw tool payloads?

If any answer is missing, the safe next state is `needs_review`, not silent trust.
