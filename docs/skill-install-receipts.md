# Skill install/load receipts

Privacy-safe receipts for answering a narrow setup question:

> After a skill installer ran, which agent targets can actually discover and load the installed skill, and what context budget did the install create?

This is not a skill marketplace, package manager, or telemetry backend. Use this receipt next to tools such as `npx skills add`, team setup scripts, Claude Code plugins, Codex/Cursor/OpenClaw skill folders, or internal bootstrap scripts when the risky part is crossing several boundaries at once:

1. the installer selected a source package/ref;
2. files were written into project or global skill roots;
3. each target agent discovered the installed manifest/resource;
4. the runtime either injected/read the skill on activation or deferred/skipped it; and
5. the new always-loaded or advertised context cost did not make the first session unsafe.

The receipt should stay reviewable without raw skill bodies, private paths, prompts, transcripts, environment dumps, secrets, tool outputs, or customer data.

## When to use it

Use a skill install/load receipt when:

- a setup command installs the same Skill into Claude Code, Codex, Cursor, OpenClaw, Zed/ACP, or another agent client;
- a plugin/installer claims "cross-agent" support but you need proof per target;
- a user says the Skill exists on disk but the runtime does not use it;
- an installer adds MCP, hooks, rules, commands, or skill folders and could increase startup context cost; or
- CI/review needs a compact proof that install succeeded without dumping the installed content.

For mutation planning before any writes begin, use [install-plan receipts](install-plan-receipts.md). For runtime-only debugging where the file already exists but disappears in ACP/Zed/CLI/chat, use [loaded-resource boundary receipts](loaded-resource-boundary.md). This receipt sits between them: installer result + per-target discovery/load/budget proof.

## Minimum contract

```json
{
  "receipt_type": "agent.skill_install_receipt.v1",
  "run_id": "skill-install-demo-001",
  "installer": {
    "name": "skills-cli",
    "command_class": "skill_package_install",
    "source": {
      "kind": "git_ref",
      "package": "vercel-labs/skills/context-budget-preflight",
      "ref": "sha256:source-package-hash"
    }
  },
  "mode_effective": "post_install_check",
  "writes_completed": true,
  "targets": [
    {
      "agent": "claude-code",
      "scope": "project",
      "required": true,
      "install_status": "installed",
      "discovery_status": "discovered",
      "load_status": "activation_required",
      "activation": "on_demand_skill_description",
      "context_cost_bucket": "0-1k",
      "safe_to_start_session": true
    }
  ],
  "overall_safe_to_start_session": true,
  "privacy_exclusions": ["raw_skill_body", "raw_prompt", "transcript", "secrets", "env_dump", "private_absolute_path"]
}
```

## Fields that matter most

- `installer.source` — package/ref/hash identity without embedded credentials.
- `targets[].agent` and `targets[].scope` — which client and project/global root were targeted.
- `targets[].install_status` — `installed`, `skipped`, or `failed`.
- `targets[].discovery_status` — whether the target client can discover the installed manifest/resource.
- `targets[].load_status` — `injected`, `readable`, `activation_required`, `deferred`, `not_tested`, or `failed`.
- `targets[].context_cost_bucket` — coarse estimate such as `0-1k`, `1k-5k`, `5k-20k`, `over_budget`, or `unknown`; do not log raw schemas or skill text.
- `targets[].safe_to_start_session` — false if a required target failed install/discovery, the runtime load test failed, or budget is already over cap.
- `overall_safe_to_start_session` — false unless every required target is safe.

## Copyable smoke test

```bash
node examples/skill-install-receipts/check-skill-install-receipt.mjs \
  examples/skill-install-receipts/skill-install-receipt.json
```

Expected output:

```text
skill install receipt ok: 3 targets checked
```

## What this proves / does not prove

Proves:

- the installer wrote or skipped the intended targets;
- each required target has an explicit discovery/load status;
- context cost is bucketed before a session starts; and
- raw skill/source content stayed out of the receipt.

Does not prove:

- the Skill is semantically good;
- the agent will choose the Skill for every matching task;
- the source package is trustworthy beyond the pinned ref/hash; or
- runtime behavior in clients not listed in `targets`.
