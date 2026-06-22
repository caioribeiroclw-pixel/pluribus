# MCP tool visibility receipts

MCP memory, Git, GitLab, code-search, and knowledge-graph servers can be healthy while the agent still cannot see their tools.

A useful debug artifact should prove each boundary separately:

1. **Server launched** — the configured command starts without leaking env/secrets.
2. **Handshake completed** — client and server agreed on a protocol version and capabilities.
3. **Proxy catalog returned** — a direct `tools/list` call returns the expected tool count and names.
4. **Client catalog visible** — the actual agent UI/runtime exposes the same tools under the expected names.
5. **Invocation allowed or refused** — the first tool call either runs, or returns an explicit permission/config/schema reason.

`server healthy` is not enough. `tools/list` is not enough. The receipt needs to say where the chain stopped.

## 60-second probe for any stdio MCP server

Replace the command after the pipe with the server command you already configured in Claude Code, Cursor, Codex, OpenClaw, or another MCP client.

```bash
(
  printf '%s\n' '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"receipt-probe","version":"0.1.0"}},"id":1}'
  printf '%s\n' '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
) | your-mcp-server-command
```

Record only metadata, not raw prompt/source/tool output. For timing-sensitive bugs, prefer JSONL events plus one final summary instead of a single snapshot; that makes the direct `tools/list` result joinable to the client-visible catalog later.

```jsonl
{"event":"mcp.server.launched","session_id":"sess-redacted-01","server_name":"gitlab","server_command_hash":"sha256:...","launch_status":"live"}
{"event":"mcp.handshake.completed","session_id":"sess-redacted-01","server_name":"gitlab","protocol_version_requested":"2024-11-05","handshake_status":"ok"}
{"event":"mcp.tools.proxy_listed","session_id":"sess-redacted-01","server_name":"gitlab","tool_catalog_snapshot_id":"cat-direct-01","direct_tools_fingerprint":"sha256:...","visible_count":172,"tool_names_sample":["glab_issue_list","glab_mr_view"]}
{"event":"mcp.tools.client_visible","session_id":"sess-redacted-01","client_name":"Claude Code","server_name":"gitlab","tool_catalog_snapshot_id":"cat-client-01","client_visible_tools_fingerprint":"sha256:empty","visible_count":0,"hidden_count":172}
{"event":"mcp.tool_visibility.summary","session_id":"sess-redacted-01","client_name":"Claude Code","server_name":"gitlab","launch_status":"live","handshake_status":"ok","direct_tools_fingerprint":"sha256:...","client_visible_tools_fingerprint":"sha256:empty","visible_count":0,"hidden_count":172,"first_invocation_status":"not_attempted","refusal_reason":"client catalog exposed zero tools","stopped_at":"client_catalog_visible","redaction_policy":"names/counts/fingerprints only; no args, outputs, tokens, paths, env, or source snippets"}
```

Minimum join keys and fields:

- `session_id` — redacted/stable enough to join launch, handshake, proxy catalog, client catalog, and first invocation events from one debugging run.
- `client_name` and `server_name` — separate host/client bugs from server bugs.
- `tool_catalog_snapshot_id` — distinguish multiple catalog reads during startup or reconnect.
- `direct_tools_fingerprint` and `client_visible_tools_fingerprint` — compare catalog equality without pasting full schemas.
- `visible_count` and `hidden_count` — make “server returned tools, client exposed none” unambiguous.
- `launch_status`, `handshake_status`, `first_invocation_status`, and `refusal_reason` — identify where the chain stopped.
- `redaction_policy` — state what was withheld so maintainers know the report is intentionally metadata-only.

## Acceptance check

For a release or bug report, ask for one small matrix:

| Boundary | Evidence | Pass condition |
| --- | --- | --- |
| Launch | `session_id`, server command hash + exit/live status | command starts and stays alive long enough for handshake |
| Handshake | protocol version + capabilities summary | initialized without version/schema mismatch |
| Proxy catalog | direct `tools/list` count + stable fingerprint/sample | expected tools returned directly |
| Client catalog | client-visible count + stable fingerprint/sample | same class of tools visible to the agent |
| First invocation | allowed/refused reason | failure explains permission/config/schema, not silent absence |
| Summary | final JSONL summary event | issue templates can quote one compact object while preserving event timing |

This shape is intentionally compatible with GitHub/GitLab issue reports and OpenTelemetry-style events. It helps maintainers separate server bugs from client catalog, protocol-version, schema, timeout, and permission bugs without asking users to paste private output.

## Why this belongs near Pluribus

Pluribus should not become an MCP gateway or memory database. The narrow value is evidence for context boundaries:

- generated instruction files prove what static rules were written;
- memory/search receipts prove what retrieved context was delivered;
- tool visibility receipts prove whether a configured MCP capability actually crossed into the agent's usable catalog.

If a tool is not visible to the agent, the project has no reliable context handoff no matter how healthy the server looks.
