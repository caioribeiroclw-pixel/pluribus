---
name: skill-policy-receipts
description: Use when a task must obey a hard project policy, such as "do not generate tests for internal services", "do not call production APIs", or "do not edit generated files". Emits a privacy-safe receipt before writes and after guard checks.
---

# Skill Policy Receipts

This Skill turns natural-language guardrails into an inspectable policy receipt.

## Preflight: decide before writing

Before creating or editing files:

1. List intended targets using coarse paths or globs.
2. For each target, decide `allowed` or `refused`.
3. Give a short reason.
4. If any target is refused, stop before writing.
5. Emit a receipt with `write_started=false` and `stopped_at="policy_refused"`.

Receipt shape:

```json
{
  "receipt_type": "skill.policy.v1",
  "skill": "skill-policy-receipts",
  "policy_scope": "<short policy name>",
  "targets": [
    {
      "target": "<coarse path or glob>",
      "decision": "allowed|refused",
      "reason": "<short reason>"
    }
  ],
  "write_started": false,
  "post_write_guard": "not_run",
  "stopped_at": "policy_refused|all_targets_allowed"
}
```

Do not include raw prompts, code, secrets, customer data, stack traces, or full tool output.

## Write only after all targets are allowed

If every target is allowed:

1. Emit or state `stopped_at="all_targets_allowed"`.
2. Perform the write.
3. Run the configured post-write guard.
4. Emit whether the guard passed or failed.

Post-write receipt shape:

```json
{
  "receipt_type": "skill.policy.v1",
  "skill": "skill-policy-receipts",
  "policy_scope": "<short policy name>",
  "write_started": true,
  "post_write_guard": "passed|failed|not_configured",
  "stopped_at": "guard_passed|guard_failed"
}
```

## Example policy: no internal-service unit tests

Policy:

> Do not generate unit tests for internal services. If the requested test imports `internal/`, `@/internal`, or a known private service module, refuse before writing and explain the safer target.

Example guard:

```bash
grep -R "from ['\"]\.\./\.\./internal\|from ['\"]@/internal\|require(['\"]@/internal" \
  -- '*test.*' '*spec.*'
```

If the grep finds a match in generated tests, stop and report `post_write_guard="failed"`.
