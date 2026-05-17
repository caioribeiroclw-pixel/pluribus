# Cursor ↔ Claude Code context handoff

Use this when you switch between Cursor, Claude Code, Copilot/Codex-style assistants, and terminal agents and keep re-explaining the same project facts.

Pluribus is not a chat transcript mover and not a memory database. It is the small, reviewable layer for **intentional project context**: architecture notes, conventions, constraints, workflow rules, and safety boundaries that should survive tool switches.

## Audience

This guide is for developers who:

- use Cursor for IDE work and Claude Code or a terminal agent for larger changes;
- also keep Copilot instructions, `AGENTS.md`, Windsurf/Continue/Zed rules, or similar files;
- want a repo-local source of truth instead of manually copying context between tools;
- do not want a background service or MCP server just to keep instruction files aligned.

If you need semantic recall over notes, use a memory/MCP/RAG tool. If you need the same project instructions available to several tools, use a versioned context file and sync it.

## 60-second disposable test

```bash
mkdir ai-context-handoff-demo
cd ai-context-handoff-demo

npx --yes pluribus-context@latest init \
  --name "Handoff Demo" \
  --description "A repo used from Cursor, Claude Code, and Copilot" \
  --tools claude,cursor,copilot,openclaw

npx --yes pluribus-context@latest validate
npx --yes pluribus-context@latest sync --dry-run
```

The dry run shows the generated outputs before writing tool files:

| Tool | File |
| --- | --- |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| OpenClaw / agent runners | `AGENTS.md` |

If the preview looks right:

```bash
npx --yes pluribus-context@latest sync
npx --yes pluribus-context@latest audit
```

Commit `pluribus.md` as the source of truth. Commit generated files if you want each tool to work immediately after clone.

## What to put in `pluribus.md`

Keep only context that should be stable enough to review in git:

```markdown
<!-- pluribus:tools: claude,cursor,copilot,openclaw -->

# Identity
I am building Acme Billing, a TypeScript service used by finance operators.

# Stack
- Node.js 22
- PostgreSQL
- Vitest

# Conventions
- Prefer small, reviewed changes over large rewrites.
- Do not change database migrations without adding a rollback note.
- Keep API compatibility unless an issue explicitly approves a breaking change.

# Goals
1. Make billing changes safe to review.
2. Keep AI tool behavior consistent across IDE and terminal workflows.

# Constraints
- Never paste secrets, customer data, tokens, or private chat logs into context files.
- Repository code and tests override stale generated context.

# Workflow
1. Read the relevant code and this project context before proposing changes.
2. Run the smallest meaningful test before claiming a fix.
3. Update `pluribus.md` when project conventions change, then run `pluribus sync`.
```

## Handoff pattern

1. **Before switching tools:** put durable project facts in `pluribus.md`, not in a one-off chat.
2. **Preview:** run `pluribus sync --dry-run` to see what each tool will receive.
3. **Sync:** generate native files when the preview is correct.
4. **Audit:** run `pluribus audit` locally or in CI to catch drift when someone edits generated files directly.
5. **Use memory separately:** if you also run an MCP memory server, keep the recall/store protocol in `pluribus.md` and let the memory server store durable facts.

## What this deliberately does not solve

- It does not move active chat state from Cursor to Claude Code.
- It does not summarize your current conversation automatically.
- It does not store or retrieve memories.
- It does not replace MCP tools, RAG over notes, or agent memory.

That boundary is the point: project instructions should be boring, reviewable, and easy to diff. Runtime memory can stay specialized.

## Feedback wanted

If this fails on a real multi-tool repo, the useful feedback is specific:

- which tools you use together;
- which context files already existed;
- whether `audit` found the right missing/stale file;
- which generated file felt semantically wrong for that tool.

Open feedback here: https://github.com/caioribeiroclw-pixel/pluribus/discussions/13
