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

## What usually breaks first

When developers switch seriously between Cursor, Claude Code, Codex/Copilot-style tools, Windsurf, and terminal agents, the failure is rarely “there is no context anywhere.” It is usually one of these smaller breaks:

| Break | Symptom | Fast check |
| --- | --- | --- |
| Source file stale | `AGENTS.md`, `CLAUDE.md`, or `.cursorrules` still describes old paths, commands, or architecture | Run `pluribus audit`; compare generated output to the committed `pluribus.md` source |
| Tool-specific layer diverged | Cursor rules say one convention, Claude/Codex instructions say another | Keep tool-specific files generated/thin; review manual edits as drift |
| Memory became authority | An MCP memory/Obsidian/Notion note overrides the current repo state | Put memory recall/store policy in `pluribus.md`; require code/tests/current docs to win over recalled facts |
| Commands or paths changed | The agent follows a dead build/test command copied from an older chat | Keep commands in `package.json`, `Makefile`, `justfile`, or scripts; link to them from context instead of duplicating shell snippets |
| Context was never loaded | The right file exists, but the active tool/session did not read it | Ask for a short handoff receipt before edits: which source file, generated target, memory recall, and test command were actually used |

## Copyable handoff receipt

Use this as a lightweight debugging note before a risky cross-tool handoff. It is intentionally privacy-safe: hashes, paths, and decisions instead of raw prompt transcripts or private source content.

```json
{
  "handoff_id": "cursor-to-claude-2026-06-16-001",
  "from_tool": "cursor",
  "to_tool": "claude-code",
  "repo_ref": {
    "branch": "main",
    "head_sha": "abc1234"
  },
  "source_of_truth": {
    "path": "pluribus.md",
    "sha256": "hash-of-current-project-context",
    "validated_at": "2026-06-16T00:00:00Z"
  },
  "generated_context": [
    {
      "tool": "cursor",
      "path": ".cursorrules",
      "status": "in_sync"
    },
    {
      "tool": "claude-code",
      "path": "CLAUDE.md",
      "status": "in_sync"
    },
    {
      "tool": "openclaw-or-codex-style-agent",
      "path": "AGENTS.md",
      "status": "in_sync"
    }
  ],
  "memory_policy": {
    "mcp_memory_allowed": true,
    "current_repo_overrides_memory": true,
    "store_new_facts_without_review": false
  },
  "active_task": {
    "summary": "Implement the smallest safe patch for issue #123",
    "allowed_paths": ["src/billing/**", "tests/billing/**"],
    "required_checks": ["npm test -- billing"]
  },
  "loaded_evidence": {
    "agent_says_it_read": ["CLAUDE.md", "package.json"],
    "missing_or_deferred": ["old Obsidian architecture note"],
    "stale_conflicts_found": []
  },
  "safe_to_continue": true
}
```

The receipt should be boring. If it shows stale conflicts, missing generated files, or memory overriding current repo state, stop and fix the source of truth before asking another agent to write code.

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
