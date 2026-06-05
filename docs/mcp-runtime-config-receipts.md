# MCP runtime config receipts

MCP config review gets noisy when every file that looks like an MCP config is treated as an active permission change. A live `.mcp.json` can change what Claude Code, Cursor, Codex, Windsurf, Zed, or another client can load. A `.mcp.json.template`, `.sample`, `.example`, catalog entry, or disabled profile usually cannot.

An MCP runtime config receipt records that boundary without dumping secrets or full config bodies. The question is not "does this repository contain MCP-shaped JSON?" The useful question is:

> Can this changed file be loaded by an agent runtime now, and did it change the active tool/command/env permission surface?

## Minimal receipt shape

```json
{
  "schema": "pluribus.mcp_runtime_config_receipt.v1",
  "run_id": "mcp-config-review-2026-06-05T23:00Z",
  "generated_at": "2026-06-05T23:00:00Z",
  "repository_ref": "github:example/app@pull/123",
  "configs": [
    {
      "path": ".mcp.json",
      "client": "claude-code",
      "source_kind": "runtime_config",
      "runtime_active": true,
      "loaded_by": ["claude-code"],
      "change_kind": "server_added",
      "permission_surface_changed": true,
      "sample_config_review": false,
      "should_alert": true,
      "evidence": [
        { "kind": "config_digest", "ref": "sha256:9a1c..." },
        { "kind": "client_discovery_rule", "ref": "claude-code:.mcp.json" }
      ],
      "redacted_env_keys": {
        "required": ["GITHUB_TOKEN"],
        "present": [],
        "missing": ["GITHUB_TOKEN"]
      }
    }
  ]
}
```

## Review rule

Use the receipt to keep these cases separate:

| File/change | Runtime-active? | Default review result |
| --- | --- | --- |
| `.mcp.json`, Cursor/Windsurf/Zed/Codex/Claude settings that a client loads | yes | alert when server, command, env, or tool surface changes |
| `.mcp.json.template`, `.sample`, `.example` | no | quiet by default |
| disabled profile or catalog example | no | quiet by default |
| sample/template review explicitly enabled | no | label as `sample_config_review`, not `runtime_permission_drift` |

This avoids false positives that teach reviewers to ignore MCP permission checks.

## Privacy boundary

Do record:

- path or reviewed alias;
- target client/runtime;
- whether the path is runtime-active;
- source kind (`runtime_config`, `sample_config`, `disabled_config`, `catalog_example`);
- change kind (`server_added`, `server_removed`, `command_changed`, `env_changed`, `tools_changed`, `unchanged`);
- before/after digests or reviewed evidence refs;
- required/present/missing environment **key names**.

Do **not** record:

- env values, tokens, API keys, cookies, credentials, or private server URLs;
- raw full config bodies when a digest is enough;
- prompts, transcripts, tool outputs, or customer data;
- local absolute paths unless already safe to reveal in review.

## Copyable checker

The [MCP runtime config receipt example](../examples/mcp-runtime-config-receipts/) includes a tiny checker that validates the active-vs-template boundary and warns on review noise.

```bash
node examples/mcp-runtime-config-receipts/check-mcp-runtime-config-receipt.mjs \
  examples/mcp-runtime-config-receipts/mcp-runtime-config-receipt.json
```

Expected output:

```text
mcp runtime config receipt ok: 3 configs checked, 1 runtime alert, 0 review-noise warnings
```

## Where this fits

This is adjacent to [MCP tool visibility receipts](mcp-tool-visibility-receipts.md), but it answers an earlier review question. Tool visibility receipts ask why a healthy MCP server did not appear in a client catalog. Runtime config receipts ask whether a changed config file should count as an active permission/config drift event at all.
