# Rendered output receipts

Teams often solve multi-tool setup drift by putting a single manifest in git: MCP servers in `.mcpmrc`, rules in `AGENTS.md`, prompts in `pluribus.md`, or shared memory in Markdown. That is necessary, but it is not enough.

The trust boundary is the rendered output each client actually received.

A rendered output receipt proves how one canonical source became client-specific outputs for Claude Code, Cursor, VS Code, Codex, Windsurf, Zed, an MCP manager, or another agent runtime — without logging secrets, raw prompts, or full private configs.

Use it when a tool says "sync succeeded" but users still need to answer:

- did Claude Code, Cursor, and VS Code receive the same server/version/rule?
- did one client get a different path, command, env key, capability, or disabled server?
- what changed from the last-known-good rendered output?
- which secrets were intentionally omitted, and which required env keys were missing?
- what rollback snapshot can restore the previous rendered state?

## Minimal receipt shape

```json
{
  "schema": "pluribus.rendered_output_receipt.v1",
  "run_id": "mcp-sync-2026-07-01T13:00Z",
  "generated_at": "2026-07-01T13:00:00Z",
  "canonical_source": {
    "kind": "mcp_manifest",
    "path": ".mcpmrc",
    "version": "2026-07-01.1",
    "hash": "sha256:canonical-manifest-example"
  },
  "render_targets": [
    {
      "client": "claude-code",
      "target_path": ".mcp.json",
      "write_mode": "update",
      "before_hash": "sha256:old-claude-rendered-example",
      "rendered_hash": "sha256:new-claude-rendered-example",
      "last_known_good_hash": "sha256:old-claude-rendered-example",
      "server_changes": [
        {
          "server_id": "github",
          "source_ref": "github:mcp-server/github@v1.2.3",
          "change_kind": "version_changed",
          "before_version": "1.2.2",
          "after_version": "1.2.3",
          "capability_delta": ["repo:read"]
        }
      ],
      "env_keys": {
        "required": ["GITHUB_TOKEN"],
        "present": [],
        "missing": ["GITHUB_TOKEN"],
        "values_logged": false
      },
      "rollback_snapshot_id": "rollback:mcp-sync-2026-07-01T12:45Z:claude-code"
    },
    {
      "client": "cursor",
      "target_path": ".cursor/mcp.json",
      "write_mode": "dry_run",
      "before_hash": "sha256:old-cursor-rendered-example",
      "rendered_hash": "sha256:new-cursor-rendered-example",
      "last_known_good_hash": "sha256:old-cursor-rendered-example",
      "server_changes": [
        {
          "server_id": "github",
          "source_ref": "github:mcp-server/github@v1.2.3",
          "change_kind": "version_changed",
          "before_version": "1.2.2",
          "after_version": "1.2.3",
          "capability_delta": ["repo:read"]
        }
      ],
      "env_keys": {
        "required": ["GITHUB_TOKEN"],
        "present": ["GITHUB_TOKEN"],
        "missing": [],
        "values_logged": false
      },
      "rollback_snapshot_id": "rollback:mcp-sync-2026-07-01T12:45Z:cursor"
    }
  ],
  "privacy": {
    "raw_canonical_source_logged": false,
    "raw_rendered_outputs_logged": false,
    "secret_values_logged": false,
    "absolute_private_paths_logged": false
  }
}
```

## Review rule

Do not review only the canonical manifest. Review the rendered receipt for every target client.

| Question | Receipt field |
| --- | --- |
| Which source was rendered? | `canonical_source.kind/path/version/hash` |
| Which clients changed? | `render_targets[].client`, `before_hash`, `rendered_hash` |
| What server/rule changed? | `server_changes[].server_id`, `source_ref`, `change_kind` |
| Did capabilities or tools change? | `capability_delta` |
| Did a secret leak? | `env_keys.values_logged=false`, `privacy.secret_values_logged=false` |
| Can we roll back? | `rollback_snapshot_id`, `last_known_good_hash` |

## MCP config drift example

This maps directly to MCP manager workflows:

1. `.mcpmrc` or another manifest pins server ids, source refs, versions, env key names, and target clients.
2. `sync --dry-run` renders client-specific outputs and emits a receipt.
3. The receipt compares canonical intent with actual per-client output hashes.
4. Reviewers approve or reject the rendered changes without seeing secret values.
5. Rollback uses the snapshot id per client, not a vague "restore the manifest" instruction.

The [rendered output receipt example](../examples/rendered-output-receipts/) includes a tiny checker:

```bash
node examples/rendered-output-receipts/check-rendered-output-receipt.mjs \
  examples/rendered-output-receipts/mcp-rendered-output-receipt.json
```

Expected output:

```text
rendered output receipt ok: 2 targets checked, 2 changed, 1 missing-env warning
```

## What not to log

Do not include raw config bodies, raw prompts, secret values, OAuth tokens, cookies, private server URLs, customer data, or local absolute paths. Prefer stable ids, hashes, target labels, env key names, change kinds, and rollback ids.

## Where this fits

This is downstream of [MCP runtime config receipts](mcp-runtime-config-receipts.md): runtime config receipts ask whether a changed file can affect an agent runtime at all. Rendered output receipts ask whether a canonical source actually produced the client-specific outputs that users will run.

It is also adjacent to [context budget receipts](context-budget-receipts.md) and [context input evidence](context-input-evidence.md), but the unit is different: the artifact under review is the rendered client output, not the selected prompt context.
