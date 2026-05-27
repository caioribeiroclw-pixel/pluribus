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

Record only metadata, not raw prompt/source/tool output:

```json
{
  "kind": "mcp.tool_visibility.receipt",
  "server": "gitlab",
  "server_command_hash": "sha256:...",
  "protocol_version_requested": "2024-11-05",
  "handshake": "ok",
  "proxy_tools_count": 172,
  "proxy_tool_names_sample": ["glab_issue_list", "glab_mr_view"],
  "client": "Claude Code",
  "client_catalog_visible": false,
  "client_tools_count": 0,
  "stopped_at": "client_catalog_visible",
  "privacy": "names/counts only; no args, outputs, tokens, paths, or source snippets"
}
```

## Acceptance check

For a release or bug report, ask for one small matrix:

| Boundary | Evidence | Pass condition |
| --- | --- | --- |
| Launch | server command hash + exit/live status | command starts and stays alive long enough for handshake |
| Handshake | protocol version + capabilities summary | initialized without version/schema mismatch |
| Proxy catalog | `tools/list` count + stable tool-name sample | expected tools returned directly |
| Client catalog | client-visible count + naming prefix | same class of tools visible to the agent |
| First invocation | allowed/refused reason | failure explains permission/config/schema, not silent absence |

This shape is intentionally compatible with GitHub/GitLab issue reports and OpenTelemetry-style events. It helps maintainers separate server bugs from client catalog, protocol-version, schema, timeout, and permission bugs without asking users to paste private output.

## Why this belongs near Pluribus

Pluribus should not become an MCP gateway or memory database. The narrow value is evidence for context boundaries:

- generated instruction files prove what static rules were written;
- memory/search receipts prove what retrieved context was delivered;
- tool visibility receipts prove whether a configured MCP capability actually crossed into the agent's usable catalog.

If a tool is not visible to the agent, the project has no reliable context handoff no matter how healthy the server looks.
