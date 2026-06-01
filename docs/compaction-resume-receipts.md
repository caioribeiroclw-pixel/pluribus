# Compaction resume receipts

Claude Code and Codex users are asking for `PreCompact` / `PostCompact` hooks because long sessions lose thread detail, reload rules inconsistently, or continue after a summary that no one can audit.

The risky moment is not compaction itself. The risky moment is **resuming as if nothing changed**.

A compaction resume receipt is a small, privacy-safe handoff object emitted after a compaction/restore flow. It proves what was summarized, what instruction sources were reloaded, what state was lost or kept, and whether the next agent turn is safe to continue.

## Receipt boundary

A resume receipt should prove:

- **event identity** — stable `compaction_event_id`, `session_id`, and trigger so a restore can be correlated with the hook that caused it;
- **transcript boundary** — the compacted transcript range and hash, without logging raw transcript content;
- **summary evidence** — summary hash and token count so downstream tools can detect stale or changed summaries;
- **instruction reloads** — `AGENTS.md`, `CLAUDE.md`, skills, MCP/tool manifests, workflow plans, or project rules reloaded with hashes/mtimes;
- **kept/lost fields** — explicit lists for active plan, open diffs, pending tests, rejected decisions, tool grants, or unresolved blockers;
- **resume verdict** — `safe_to_resume: true | false | unknown` plus reasons;
- **privacy flags** — no raw transcript, raw prompts, raw tool outputs, secrets, or full instruction bodies in the receipt.

## 60-second gate

The copyable example is in [`examples/compaction-resume-receipts/`](../examples/compaction-resume-receipts/):

```bash
node examples/compaction-resume-receipts/check-resume-receipt.mjs \
  examples/compaction-resume-receipts/safe-resume-receipt.json

node examples/compaction-resume-receipts/check-resume-receipt.mjs \
  examples/compaction-resume-receipts/unsafe-resume-receipt.json
```

The first passes because the restore has a stable event id, compacted transcript hash, summary hash, reloaded instruction sources, explicit kept/lost state, privacy flags, and `safe_to_resume: true` with no blocking lost fields.

The second fails because it tries to continue after missing `AGENTS.md`, hidden lost decisions, raw transcript logging, and an `unknown` verdict.

## Positioning

Memory systems remember. Hooks fire lifecycle events. This receipt answers the operational review question:

> After compaction, do we have enough verified context to continue safely?

That makes `PostCompact` / `SessionStart(compact)` restore flows auditable without turning Pluribus into a memory store or requiring private transcript capture.
