# Review primitive gate for agent handoffs

Use this when a parallel-agent run, Claude Code hook/workflow, Codex/OpenClaw handoff, or local control-plane wrapper needs to prove more than "the agent said it was done".

The market question is not just what to log after a run. It is whether a reviewer or CI job can make a decision:

- **continue** because the assignment stayed inside approved scope and required checks passed;
- **review first** because the run is partial or has explicit unverified assumptions;
- **reject / stop** because scope changed without approval, required checks were skipped or failed, or the run is unsafe to resume.

Pluribus should not be the execution control plane. Worktrees, VMs, hooks, masks, and vendor guardrails can enforce parts of the run. The useful Pluribus layer is a small, privacy-safe receipt that turns those controls into reviewable evidence across tools.

## Receipt shape

Attach this receipt to a PR body, CI artifact, run summary, or handoff packet.

```json
{
  "type": "agent.review_primitive_receipt.v1",
  "assignment_id": "agent-auth-audit-42",
  "run_id": "run-2026-05-31T17-00Z",
  "agent": {
    "tool": "claude-code",
    "role": "auth-reviewer"
  },
  "approved_boundaries": {
    "read": ["src/auth/**", "tests/auth/**"],
    "write": ["tests/auth/**"],
    "network": false
  },
  "scope_access_changes": [
    {
      "change": "read docs/security/**",
      "reason": "needed policy wording for test fixture",
      "approved": true,
      "approved_by": "human-reviewer"
    }
  ],
  "commands_and_checks": [
    {
      "name": "npm test -- tests/auth",
      "kind": "required_test",
      "status": "passed",
      "evidence": "ci://job/123#auth-tests"
    },
    {
      "name": "npm run lint",
      "kind": "required_check",
      "status": "passed",
      "evidence": "ci://job/123#lint"
    }
  ],
  "refused_operations": [
    {
      "operation": "write src/auth/session.ts",
      "reason": "outside approved write boundary"
    }
  ],
  "handoff": {
    "changed_files_bucket": "under_5",
    "evidence_path": "artifacts/agent-auth-audit-42.json",
    "next_safe_action": "review tests/auth/session.test.ts before merge"
  },
  "resume_state": "complete",
  "privacy": {
    "raw_prompts_logged": false,
    "raw_tool_output_logged": false,
    "source_code_logged": false,
    "secrets_logged": false
  }
}
```

## Minimal gate

The copyable demo in [`examples/review-primitive-gate/`](../examples/review-primitive-gate/) turns the receipt into a CI/reviewer decision.

If you use Claude Code hooks, the [`examples/claude-code-review-hook/`](../examples/claude-code-review-hook/) bridge shows how to run the same gate from `TaskCompleted`, `PostCompact`, or `SessionEnd` without logging raw prompts, transcripts, tool output, source code, or secrets.

```bash
node examples/review-primitive-gate/check-review-receipt.mjs \
  examples/review-primitive-gate/pass-review-receipt.json

node examples/review-primitive-gate/check-review-receipt.mjs \
  examples/review-primitive-gate/fail-review-receipt.json
```

The gate passes only when:

- `type` is `agent.review_primitive_receipt.v1`;
- `assignment_id` and `run_id` exist;
- approved read/write boundaries are present;
- every scope/access change is explicitly approved;
- every required check/test passed;
- `resume_state` is `complete`.

The gate fails when a run is `partial` or `unsafe-to-resume`, when a required check is skipped/failed, or when scope changed without approval. That is intentional: partial work can be valuable, but it should not silently pass a merge gate.

## What to keep out

Do not put raw prompts, full transcripts, source code, exact proprietary paths, secrets, customer data, or raw tool output in the receipt. Use coarse globs, hashes, CI URLs, artifact IDs, pass/fail states, and human-readable next safe actions.

## Why this is different from a receipt field list

A field list says what happened. A review primitive says what the next system is allowed to do with that evidence.

If the artifact cannot reject a PR, pause a handoff, or force review when the run became partial/unsafe, it is probably just a nicer `plan.md`.
