# Install-plan receipts

Use this when an MCP server, Skill bundle, plugin, starter kit, or setup script says it can configure many AI coding tools for you.

The risk is not only whether a hook later runs safely. The earlier boundary is the installer itself: it may detect agents, write MCP config, add instruction files, install Skills, register hooks, or create backups before the user understands what changed.

The goal is a tiny, privacy-safe pre-mutation receipt that proves what the setup step intends to touch **before the first write starts**. Do not log prompts, source code, secrets, raw environment dumps, transcripts, raw command output, customer data, or private absolute paths.

## Boundary to prove

For every setup/install run, capture a plan like this before applying changes:

```json
{
  "receipt_type": "agent.install.plan.v1",
  "run_id": "local-install-2026-05-29T16:00Z",
  "installer": "code-memory-mcp",
  "mode_requested": "plan",
  "mode_effective": "plan",
  "agents_detected": ["claude-code", "cursor", "codex", "openclaw"],
  "agents_selected": ["claude-code", "openclaw"],
  "planned_writes": [
    {
      "kind": "mcp_config",
      "target": "claude-code project config",
      "operation": "add_server",
      "backup_planned": true
    },
    {
      "kind": "instruction_file",
      "target": "AGENTS.md",
      "operation": "append_usage_notes",
      "backup_planned": true
    },
    {
      "kind": "hook",
      "target": "pre-tool hook config",
      "operation": "register_command",
      "backup_planned": true
    }
  ],
  "external_commands_planned": [
    { "phase": "apply", "command_class": "package_manager_install" }
  ],
  "network_after_install": "mcp_server_localhost_only",
  "writes_started": false,
  "next_safe_command": "installer apply --from-plan install-plan.json"
}
```

Keep `target` values coarse enough for review. Prefer `claude-code project config` over a full local path, and `package_manager_install` over raw shell output.

## Acceptance checks

A safe installer should make these claims inspectable:

1. **Plan mode exists** — `install --plan`, `install --dry-run`, or equivalent emits the receipt without writing files.
2. **Effective mode is explicit** — if the user requested `apply` but policy downgraded to `plan`, the receipt says so.
3. **Agent detection is separated from selection** — finding Cursor/Codex/Claude/OpenClaw does not imply every detected tool will be changed.
4. **Every planned write has a kind and backup decision** — config, instruction file, Skill, hook, shell profile, lockfile, cache, or generated artifact.
5. **Writes are still false at receipt time** — `writes_started=false` is the key trust boundary.
6. **Apply can be repeated from the plan** — the user can review one artifact, then run a concrete next command.
7. **No private payloads leak** — no raw source, prompts, env dumps, secrets, token values, transcripts, stack traces, or raw tool output.

## Why this matters for hooks and MCP

Hooks, Skills, and MCP configs are often discussed as runtime supply-chain surfaces. That is true, but it is downstream. A one-command installer can create the hook or MCP entry first.

A hook receipt answers: “what executed?”

An install-plan receipt answers the earlier question: **“what is about to be installed, written, and trusted?”**

If an installer cannot answer that before mutation, treat it like running CI from an untrusted fork: useful, but not automatically safe.

## Try the copyable example

See [`examples/install-plan-receipts/`](../examples/install-plan-receipts/) for a small review checklist and sample receipt you can copy into setup scripts, README install sections, or agent-managed onboarding workflows.
