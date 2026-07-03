# MCP tool identity map receipt

This tiny demo shows the audit record a lazy MCP gateway should keep when it hides hundreds of upstream tools behind search + call meta-tools.

The model-visible alias is not enough. A reviewer also needs to know which server/account/profile and exact tool definition crossed the gateway boundary.

## Try it

```bash
node verify-tool-identity.cjs identity-map.json tool-events.jsonl
```

Expected output:

```text
tool identity receipt ok: 2 aliases verified against tool-events.jsonl
```

The drift fixture should fail:

```bash
node verify-tool-identity.cjs identity-map.json tool-events-drift.jsonl
```

Why it fails: the event says the model called `github_personal.create_issue`, but the call record carries the `work` profile/hash. That is the bug this receipt is meant to expose before a human trusts the audit trail.

## Minimal fields

For each exposed tool alias, keep:

- `exposed_alias` — the name the model saw, e.g. `github_work.create_issue`.
- `source_server` and `profile` — the authority boundary, e.g. `github` + `work` vs `personal`.
- `upstream_tool_name` — the original tool name before gateway prefixing.
- `tool_definition_hash` — stable hash of the upstream tool schema/description.
- `first_seen` / `last_seen` — when this alias-definition binding was observed.

For each search/call event, log the alias plus the same server/profile/hash. A lazy gateway can then prove:

```text
searched query Q -> surfaced alias A from server/profile S -> called upstream tool hash H
```

That is the boundary Pluribus cares about: the capability identity that moved from hidden inventory into model context and then into an actual tool call.
