# Skill use-rate receipts

Agent Skill installers are getting good at the first boundary: download a Skill and attach it to Claude Code, Cursor, Codex, OpenCode, or another harness. The next boundary is harder: **installed is not used**.

A skill use-rate receipt is a privacy-safe record that separates four states:

1. **Discovered** — the installer/catalog found the Skill.
2. **Installed/attached** — files or symlinks were written for a target agent/scope.
3. **Invoked** — a session actually selected or loaded the Skill.
4. **Useful enough to keep** — the Skill affected a reviewed action, check, or decision in a defined window.

This matters when a team installs many Skills, plugins, commands, or subagents and later cannot tell which ones are just prompt clutter. The receipt should prove lifecycle state and usage counters without logging raw Skill bodies, prompts, source code, transcripts, or tool output.

## Minimal receipt shape

```json
{
  "schema": "pluribus.skill_use_rate_receipt.v1",
  "run_id": "skills-audit-2026-06-05T13:00Z",
  "generated_at": "2026-06-05T13:00:00Z",
  "installer": {
    "name": "skills",
    "version": "1.5.9",
    "command_digest": "sha256:..."
  },
  "window": {
    "started_at": "2026-05-22T00:00:00Z",
    "ended_at": "2026-06-05T13:00:00Z"
  },
  "skills": [
    {
      "skill_id": "frontend-design",
      "source_ref": "github:vercel-labs/agent-skills/skills/frontend-design@main",
      "target_agent": "claude-code",
      "scope": "project",
      "install_method": "symlink",
      "discovered": true,
      "installed": true,
      "attached": true,
      "invoked_count": 7,
      "acted_on_count": 3,
      "last_invoked_at": "2026-06-05T10:12:08Z",
      "unused_since_install": false,
      "context_cost_bucket": "small",
      "evidence": [
        {
          "kind": "session_log_digest",
          "ref": "sha256:0b7d..."
        }
      ]
    }
  ]
}
```

## Evaluation questions

Use this receipt to ask:

- Which Skills are installed but never discovered by the harness?
- Which Skills are discoverable but never invoked?
- Which Skills are invoked but never acted on?
- Which Skills are globally installed but only useful in one project?
- Which Skills should be detached, narrowed, or promoted to a hard policy/check?

## Privacy boundary

Do record:

- source refs and commit/tag when available;
- target agent and scope;
- install method (`copy`, `symlink`, generated file, ephemeral use);
- boolean lifecycle states;
- invocation and acted-on counters;
- timestamps, hashes, and non-sensitive evidence refs.

Do **not** record:

- full Skill Markdown bodies;
- raw user prompts or transcripts;
- source code or tool output;
- private file paths beyond a reviewed alias;
- secrets, tokens, customer data, or unredacted environment values.

## Copyable checker

The [skill use-rate receipt example](../examples/skill-use-rate-receipts/) includes a small checker that validates required lifecycle fields and prints installed-but-unused Skills as review warnings rather than pretending installation equals adoption.

```bash
node examples/skill-use-rate-receipts/check-skill-use-rate.mjs \
  examples/skill-use-rate-receipts/skill-use-rate-receipt.json
```

Expected output:

```text
skill use-rate receipt ok: 3 skills checked, 1 unused install warning
```

## Where this fits

This is adjacent to [Skill install/load receipts](skill-install-receipts.md), but it answers a different question. Install/load receipts decide whether it is safe to start a session after an installer runs. Skill use-rate receipts decide whether a Skill actually earned its place after real sessions.

The market signal behind this is current Skill/plugin consolidation pressure: teams can install many prompt resources, but the useful metric is not package count. It is `invoked / installed` and, when possible, `acted_on / invoked` over a reviewable window.
