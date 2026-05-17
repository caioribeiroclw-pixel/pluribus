<!-- pluribus:tools: claude,cursor,copilot,openclaw -->

# Identity

I am building **Acme Billing**, a TypeScript service used by finance operators to review invoices, payments, and reconciliation exceptions.

This repository is edited with Cursor for IDE work, Claude Code for larger terminal tasks, GitHub Copilot for inline assistance, and OpenClaw-style agents for automation.

# Stack

- TypeScript strict mode
- Node.js 22 LTS
- PostgreSQL
- Vitest for unit tests
- GitHub Actions for CI

# Conventions

- Prefer small, reviewable changes over broad rewrites.
- Keep generated AI context files in sync from `pluribus.md`; do not edit `CLAUDE.md`, `.cursorrules`, Copilot instructions, or `AGENTS.md` by hand.
- Add or update tests for billing logic changes.
- For database changes, include migration intent and rollback notes in the PR.
- Treat repository code, tests, and migrations as the source of truth when generated context is stale.

# Goals

1. Make AI-assisted billing changes safe to review.
2. Keep Cursor, Claude Code, Copilot, and terminal agents aligned on the same project boundaries.
3. Avoid re-explaining stable project context in every new tool session.

# Constraints

- Never place secrets, tokens, credentials, private customer data, or full chat transcripts in `pluribus.md` or generated context files.
- Do not let AI tools invent billing policy, pricing, legal commitments, or customer-facing promises.
- Do not change migrations, payment semantics, or reconciliation rules without tests and explicit review context.
- If tool-specific generated files drift from `pluribus.md`, update the source file first and regenerate.

# Workflow

1. Before meaningful changes, read this context and inspect the relevant code.
2. If a project convention changes, edit `pluribus.md` and run `npx --yes pluribus-context@latest sync --dry-run`.
3. When the preview looks right, run `npx --yes pluribus-context@latest sync`.
4. Run `npx --yes pluribus-context@latest audit` before opening a PR so generated context files do not drift.
5. Use memory/MCP/RAG tools only for durable recall; keep the cross-tool instruction protocol here in git.

# Context

This example demonstrates a boring but useful handoff: one reviewed project context file feeds the native instruction files used by Cursor, Claude Code, Copilot, and agent runners. It is intentionally not a memory server and not a transcript migration tool.
