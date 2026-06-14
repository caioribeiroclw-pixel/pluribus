# Agent surface proof chain

Agent setup is becoming a bundle, not a file: Skills, hooks, MCP servers, subagents, slash commands, permissions, profiles, plugins, and cross-model workers all get installed or synced together.

A single “receipt” is too vague for that surface. Use the smallest proof object for the boundary you are crossing, and do not let one green check imply the next boundary worked.

## Quick model

```text
registry publishes
  → installer plans writes
  → sync applies writes
  → host exposes surface
  → task makes tools/skills eligible
  → runtime calls or activates them
  → workers hand results back
  → reviewer/CI promotes state
```

Each arrow can fail independently.

## Boundary-specific proof objects

| Boundary | Use this proof object | Proves | Does **not** prove |
| --- | --- | --- | --- |
| Setup script or plugin is about to write files | **Install diff** | Planned files, permissions, hooks, MCP servers, Skills, commands, backups, network/env access, and `writes_started=false` before mutation | The host later loaded or used any installed surface |
| Registry sync says it succeeded | **Post-sync manifest** | Published asset version, target agents/scopes, written paths, content hashes, skipped targets, errors, and restart requirements | Runtime discovery or activation |
| Continuous config sync ran with `--apply` | **Post-apply ledger** | What was actually written, skipped, backed up, failed, or sent to manual review after apply | That Claude/Codex/Cursor followed the config |
| Host starts after install/sync | **Surface state** | What is visible/attached/discovered vs skipped/withheld: Skills, hooks, MCP tools, agents, slash commands, instruction files | That a specific task selected the right surface |
| Runtime task decides what to use | **Selection trace** | Available → eligible → called → enforced for tools/Skills/MCP, with privacy-safe reasons | That the output is correct |
| Long session, compaction, or topic switch resumes work | **Read receipt / safe-to-edit gate** | Which index/topic files or summaries reloaded, active constraints, stale notes rejected, and whether editing is safe | That future turns will keep following the context |
| Debugger shows a chain of LLM calls | **Context-boundary span** | Which context inputs crossed into each node, hashes/paths by default, withheld inputs, replay reason, downstream invalidations | A raw prompt dump, secret-safe by itself, or full correctness |
| Claude delegates to Codex/Gemini/subagents | **Handoff envelope** | Task, parent-plan hash, allowed files/commands, passed context sources, output schema, timeout, and insufficient-context path | That worker output is trusted project state |
| Worker results are merged back | **Merge-back evidence** | What changed, evidence used, assumptions, invalidated downstream outputs, and reviewer/CI promotion decision | That the original worker had complete context |

## Minimal fields by proof object

### Install diff

```json
{
  "proof_type": "install_diff",
  "installer": "claude-code-setup",
  "targets": ["claude-code", "codex"],
  "planned_writes": [
    {"path": ".claude/hooks/pretooluse.json", "kind": "hook", "backup": true},
    {"path": ".mcp.json", "kind": "mcp_config", "backup": true}
  ],
  "env_or_network_access": ["ANTHROPIC_API_KEY:required-not-recorded"],
  "writes_started": false,
  "review_required": true
}
```

### Post-sync manifest

```json
{
  "proof_type": "post_sync_manifest",
  "run_id": "skills-sync-2026-06-14T21:00Z",
  "source": "team-skills-registry",
  "targets": [
    {
      "agent": "claude-code",
      "scope": "project",
      "skills_dir": ".claude/skills",
      "written": [{"name": "review-pr", "version": "1.4.2", "sha256": "..."}],
      "skipped": []
    }
  ],
  "restart_required": true
}
```

### Post-apply ledger

```json
{
  "proof_type": "post_apply_ledger",
  "run_id": "config-sync-123",
  "plan_hash": "sha256:...",
  "writes_started": true,
  "backup_root": ".agent-sync/backups/2026-06-14T21-00Z",
  "operations": [
    {
      "path": "AGENTS.md",
      "status": "written",
      "before_hash": "sha256:old",
      "after_hash": "sha256:new",
      "backup_path": ".agent-sync/backups/.../AGENTS.md"
    },
    {
      "path": ".codex/config.toml",
      "status": "manual_review",
      "reason": "permission profile changed"
    }
  ]
}
```

### Selection trace

```json
{
  "proof_type": "selection_trace",
  "turn_id": "turn-42",
  "loaded_instructions": ["CLAUDE.md", ".claude/skills/memory/SKILL.md"],
  "mcp_tools_visible": ["memory.search", "memory.write"],
  "task_intent": "recall prior decision before editing auth flow",
  "expected_tools": ["memory.search"],
  "eligible_tools": ["memory.search"],
  "called_tools": ["memory.search"],
  "enforced_by_hook": true
}
```

### Handoff envelope

```json
{
  "proof_type": "handoff_envelope",
  "from": "opus-supervisor",
  "to": "codex-worker-2",
  "task": "compare parser failures in imports.test.js",
  "parent_plan_hash": "sha256:...",
  "allowed_files": ["src/utils/imports.js", "test/imports.test.js"],
  "allowed_commands": ["npm test -- imports"],
  "context_sources_passed": ["spec/context-format.md#remote-imports"],
  "expected_output_schema": "worker_result_v1",
  "stop_condition": "one patch candidate or explicit insufficient_context"
}
```

## Practical rules

1. **Do not promote intent as outcome.** A dry-run plan is not an apply ledger.
2. **Do not promote visibility as use.** A visible MCP tool or Skill is not an activated/called one.
3. **Do not promote worker output as project truth.** Merge-back needs evidence and invalidation notes.
4. **Keep receipts privacy-safe by default.** Prefer paths, hashes, names, versions, statuses, and reasons; expand raw bodies only under explicit local review.
5. **Name skipped and withheld context.** What did not load is often the failure.
6. **Use the product’s own vocabulary.** Say install diff for installers, ledger for sync apply, span for debuggers, envelope for delegation, and read receipt for re-grounding.

## When Pluribus fits

Use Pluribus when you need privacy-safe evidence around agent context boundaries: generated instruction files, Skills, MCP tools, memory/RAG results, compaction, pruning, plugin setup, or cross-tool handoffs.

Do not use Pluribus as a registry, memory server, agent orchestrator, or replacement for Claude/Codex/Cursor runtime diagnostics. It is the evidence layer around those systems.
