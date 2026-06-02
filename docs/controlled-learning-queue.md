# Controlled learning queue for AI employee-style agents

Claude Code, OpenClaw, Cursor, and MCP tools make it easy to turn a repository into a role-based worker: `CLAUDE.md` as the job description, Skills as procedures, and a `memory/` folder as durable knowledge.

That pattern compounds quickly, but it has a failure mode: the agent can overlearn from one weird lead, support ticket, or edge case and rewrite shared memory for every future run.

Use a controlled learning queue when an agent is allowed to **propose** durable memory changes but not silently promote them.

## Split the folders

```text
role/                  # job contract: responsibilities, boundaries, escalation
skills/                # callable procedures with inputs, outputs, stop conditions
memory/durable.md      # approved facts only; small enough to review
memory/working-notes.md# scratch observations; allowed to be messy/temporary
learning_queue.md      # proposed durable changes awaiting promote/reject
leads/                 # tiny job cards for active work
```

The key rule: `memory/durable.md` changes only through `learning_queue.md` proposals with source, reason, scope, expiry, and reviewer decision.

## Proposal shape

Each proposed learning should answer:

- **Source:** what run, lead, issue, or transcript produced the observation?
- **Observed:** what happened, without storing raw private text?
- **Proposed durable change:** the exact fact/rule to add, edit, or remove.
- **Reason:** why this should affect future runs, not just the current case.
- **Scope:** global, client-specific, project-specific, channel-specific, or temporary.
- **Expiry / review date:** when this fact should be rechecked.
- **Status:** proposed, promoted, rejected, or expired.

That is enough to preserve learning while keeping an agent from slowly corrupting ICP, pricing assumptions, escalation rules, or compliance boundaries.

## Try the copyable example

See [`examples/controlled-learning-queue/`](../examples/controlled-learning-queue/) for a tiny AI sales/ops worker layout and a local checker:

```bash
node examples/controlled-learning-queue/check-learning-queue.mjs examples/controlled-learning-queue/learning_queue.md
```

The checker is intentionally small. It fails proposals that are missing source/reason/scope/expiry/status, that try to auto-promote without review, or that paste raw secrets/private payloads into the learning queue.

## How this fits Pluribus

Pluribus is not trying to be the agent's brain. This pattern keeps intentional context reviewable: durable memory is a small versioned source of truth, while working notes and proposed learnings remain visibly provisional until promoted.
