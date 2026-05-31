# Claude Code review hook bridge

This example wires the [review primitive gate](../review-primitive-gate/) into Claude Code hooks so a long agent run can be blocked at handoff time when the receipt says `partial` or `unsafe-to-resume`.

Use it when you already have Claude Code hooks, a local control-plane wrapper, or CI emitting `agent.review_primitive_receipt.v1` receipts and you want Claude Code to treat the receipt as a gate rather than a note.

## Copy the hook

```bash
mkdir -p .claude/hooks .pluribus/receipts
cp examples/claude-code-review-hook/check-review-receipt-hook.mjs .claude/hooks/
cp examples/review-primitive-gate/check-review-receipt.mjs .claude/hooks/
```

Then add this to `.claude/settings.json`:

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/check-review-receipt-hook.mjs ${CLAUDE_PROJECT_DIR}/.pluribus/receipts/latest-review-receipt.json"
          }
        ]
      }
    ],
    "PostCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/check-review-receipt-hook.mjs ${CLAUDE_PROJECT_DIR}/.pluribus/receipts/latest-review-receipt.json"
          }
        ]
      }
    ]
  }
}
```

The same bridge can be attached to `SessionEnd` if your workflow writes the receipt only when a session exits.

## What the hook does

Claude Code passes hook event JSON on stdin. The bridge reads that event for traceability, runs the review gate against the receipt path, and:

- exits `0` when the receipt is complete and privacy-safe;
- exits non-zero when required evidence is missing, checks failed/skipped, scope changes were unapproved, or `resume_state` is `partial` / `unsafe-to-resume`;
- prints a small JSON result that names the hook event, receipt path, and next safe action.

It does **not** log raw prompts, transcripts, tool output, source code, exact proprietary paths, secrets, or customer data.

## Smoke test

```bash
node examples/claude-code-review-hook/check-review-receipt-hook.mjs \
  examples/review-primitive-gate/pass-review-receipt.json \
  < examples/claude-code-review-hook/sample-task-completed-event.json

node examples/claude-code-review-hook/check-review-receipt-hook.mjs \
  examples/review-primitive-gate/fail-review-receipt.json \
  < examples/claude-code-review-hook/sample-task-completed-event.json
```

The first command should pass. The second should fail and tell the reviewer why the handoff should not continue.

## Why this exists

Claude Code hooks are good at triggering automation around `TaskCompleted`, `PostCompact`, and `SessionEnd`. Pluribus should not replace that control plane. This bridge makes the missing handoff proof explicit: before the next agent resumes, prove the assignment boundary, required checks, privacy flags, evidence path, and `complete / partial / unsafe-to-resume` state.
