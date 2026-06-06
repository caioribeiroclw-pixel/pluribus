# Skill policy receipts

Use this when an Agent Skill, `CLAUDE.md`, hook, or project rule says "do not touch X" but the agent can still drift into the forbidden path.

The goal is not to log prompts or source code. The goal is a tiny, privacy-safe receipt that proves the run checked the policy boundary before writing code and again after writing code.

This was prompted by a live `r/ClaudeCode` thread where a Skill told Claude Code not to create unit tests for internal services, but the run still generated one. Natural-language policy alone was too soft; the missing piece was an inspectable guard.

## Boundary to prove

For every requested change, capture:

```json
{
  "receipt_type": "skill.policy.v1",
  "skill": "unit-test-boundary",
  "request_id": "local-run-2026-05-28T12:00Z",
  "policy_scope": "unit-test targets",
  "targets": [
    {
      "target": "src/public-api/client.test.ts",
      "decision": "allowed",
      "reason": "public API surface"
    },
    {
      "target": "src/internal/billing/reconciler.test.ts",
      "decision": "refused",
      "reason": "internal service tests are out of scope for this Skill"
    }
  ],
  "write_started": false,
  "post_write_guard": "not_run",
  "stopped_at": "policy_refused"
}
```

Keep values coarse. Do not include code, secrets, customer names, stack traces, raw tool output, or full transcripts.

## Minimal Skill guard

Add a short preflight before the Skill writes files:

```markdown
## Policy preflight

Before writing tests:

1. List the intended test targets.
2. Mark each target as `allowed` or `refused`.
3. Refuse before writing if any target imports or exercises internal services.
4. Emit a `skill.policy.v1` receipt with target names or coarse globs, decision, reason, and `write_started=false` when refused.
5. Only after every target is allowed, write files.
6. After writing, run the post-write guard and emit whether it passed.
```

Then add a post-write check that is simple enough for an agent to run reliably:

```bash
# Example: fail if generated unit tests import internal services.
grep -R "from ['\"]\.\./\.\./internal\|from ['\"]@/internal\|require(['\"]@/internal" \
  -- '*test.*' '*spec.*'
```

Adjust the grep for your repo. The important part is the receipt shape:

- `policy_target_listed`
- `policy_decision_allowed` / `policy_decision_refused`
- `refusal_reason`
- `write_started`
- `post_write_guard_passed` / `post_write_guard_failed`
- `stopped_at`

## Why this belongs next to context receipts

A Skill can be loaded and still fail to obey the boundary. That is the same class of problem as a healthy MCP server with tools invisible in the client, or a context file generated but not actually selected by the agent.

The useful question is: **where did the boundary proof stop?**

- Skill loaded, but no target list: policy was never made operational.
- Target list exists, but no decisions: policy was considered but not enforced.
- Refused target exists, but `write_started=true`: refusal came too late.
- Post-write guard failed: generated code crossed the forbidden boundary.
- Guard passed: the run has a small, reviewable receipt instead of only a confident claim.

## Try the copyable Skill recipe

See [`skills/skill-policy-receipts/`](../skills/skill-policy-receipts/) for a small `SKILL.md` recipe you can copy into Claude Code/OpenClaw-style Skill workflows.
