# Controlled learning queue example

A copyable layout for Claude Code/OpenClaw/Cursor-style "AI employee" agents that use a role file, Skills, memory, and external tools.

The pattern is simple:

- `role/job-contract.md` defines what the agent is allowed to do.
- `skills/*.md` define procedures with inputs, outputs, and stop conditions.
- `memory/durable.md` contains approved facts only.
- `memory/working-notes.md` can hold temporary observations.
- `learning_queue.md` is where the agent proposes durable memory changes as reviewable diffs.
- `leads/*.md` are tiny active job cards.

Run the smoke check:

```bash
node check-learning-queue.mjs learning_queue.md
```

Expected output:

```text
learning queue ok: 2 proposal(s), 1 pending review
```

Why it exists: agents can learn from outcomes, but durable cross-run memory should not be rewritten by one edge case without source, scope, expiry, and a promote/reject decision.
