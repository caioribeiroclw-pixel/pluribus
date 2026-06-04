# Parallel session review ledger

Use this when you run multiple Claude Code, Cursor, Codex, OpenClaw, or terminal-agent sessions in parallel and the bottleneck is no longer starting work — it is deciding whether each result can be trusted, rejected, or safely resumed.

The point is not orchestration. A review ledger is a small privacy-safe receipt that lets a human or a follow-up agent answer:

- what was this session assigned to do?
- which files, commands, and external systems was it allowed to touch?
- what does the agent claim changed?
- what evidence exists outside the agent summary?
- which checks are still missing?
- is the next reviewer allowed to continue, or should they stop and inspect?

Do **not** paste raw prompts, source code, secrets, customer data, transcripts, or full tool output into the ledger. Store stable references, hashes, check names, commit ids, redacted paths, and short evidence labels instead.

## Minimal receipt

```json
{
  "schema": "pluribus.parallel_session_review_ledger.v1",
  "generated_at": "2026-06-04T19:00:00Z",
  "run": {
    "orchestrator": "human",
    "repo": "redacted-service",
    "coordination_mode": "parallel_sessions"
  },
  "sessions": [
    {
      "id": "session-a",
      "agent": "claude-code",
      "assignment": "update validation for billing webhook retries",
      "branch": "agent/billing-webhook-retry-validation",
      "allowed_scope": {
        "files": ["src/billing/**", "test/billing/**"],
        "commands": ["npm test -- --test-name-pattern=billing"],
        "network": "none"
      },
      "agent_claim": "added retry validation and regression coverage",
      "evidence": [
        {
          "type": "commit",
          "ref": "abc1234"
        },
        {
          "type": "test",
          "name": "billing retry validation",
          "status": "passed"
        }
      ],
      "missing_checks": [],
      "privacy_flags": [],
      "state": "complete",
      "safe_next_action": "review_diff"
    }
  ]
}
```

## Review states

| State | Meaning | Required next action |
| --- | --- | --- |
| `complete` | Assignment is done and required evidence exists. | Review the diff or merge path normally. |
| `partial` | Some useful work exists but a required check or boundary is missing. | Continue only after the missing check/scope is resolved. |
| `blocked` | The agent stopped before a useful handoff. | Reassign or inspect the blocker before continuing. |
| `unsafe_to_resume` | Scope, privacy, command, or evidence boundaries were violated. | Stop; inspect manually before any follow-up agent uses the result. |

## Safe next actions

Use constrained verbs so another session does not turn a vague summary into authority:

- `review_diff`
- `run_missing_check`
- `continue_same_scope`
- `ask_human`
- `stop_manual_review`

## Copyable checker

The example in [`examples/parallel-session-review-ledger/`](../examples/parallel-session-review-ledger/) validates the useful minimum:

- every session has an assignment, branch, allowed scope, state, and safe next action;
- `complete` sessions have evidence and no missing checks;
- `partial` sessions name missing checks;
- `unsafe_to_resume` sessions use `stop_manual_review`;
- sessions with privacy flags cannot be marked complete;
- no session writes outside its declared file scope.

Run it from the repo root:

```bash
node examples/parallel-session-review-ledger/check-parallel-session-review-ledger.mjs examples/parallel-session-review-ledger/parallel-session-review-ledger.json
```

Expected output:

```text
parallel session review ledger ok: 3 sessions checked
```

## Positioning

Parallel agents do not fail only because models are weak. They fail because the human reviewer loses the boundary of each run. A ledger turns "the agent says it is done" into a small resume/reject object: assignment, scope, evidence, missing checks, and safe next action.
