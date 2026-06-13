# CLAUDE.md read receipt

A tiny, manual-first receipt for Claude Code sessions where `CLAUDE.md` is read at startup but trust erodes after a long session, compaction, `/clear`, or a topic switch.

Use it before asking the agent to edit again. The agent does **not** need to dump raw prompts or file contents. It should name the routing/index files it reloaded, the constraints it is carrying forward, and the relevant files it intentionally did not load.

## Prompt pattern

```text
Before continuing, give me a context read receipt:
- current task/topic
- session state: fresh, compacted, topic_switched, or resumed
- indexed files you reloaded and why
- 3-5 active constraints carried forward
- relevant files you did not load
- stale/historical notes you are not treating as current authority
- whether it is safe to edit now
```

If the agent cannot name what it reloaded, it probably has not grounded.

## Run the sample checker

```bash
cd examples/claude-md-read-receipts
node check-read-receipt.mjs --receipt sample-read-receipt.json
```

The bundled passing receipt models a topic switch from payments work to upload API work. It keeps `CLAUDE.md` as the router, reloads the topic doc and migration notes, lists active constraints, and marks the session safe to edit.

A stale receipt should fail:

```bash
node check-read-receipt.mjs --receipt stale-read-receipt.json
```

## Receipt shape

```json
{
  "schema": "pluribus.claude_md_read_receipt.v1",
  "session_state": "topic_switched",
  "current_task": "Update upload API retry handling",
  "reloaded_files": [
    { "path": "CLAUDE.md", "role": "router", "why": "Selects topic-specific docs" }
  ],
  "active_constraints": [
    "Do not log raw file contents",
    "Preserve max 3 retries with exponential backoff",
    "Treat v2.4.0 migration notes as current authority"
  ],
  "not_loaded_files": [
    { "path": "docs/payments.md", "why": "Previous topic only" }
  ],
  "safe_to_edit": true
}
```

## Why this exists

The market signal from Claude Code users is practical: people already maintain lean `CLAUDE.md` index files and topic memory docs, but they still have to ask whether the agent actually re-read the right material after a topic switch or compaction.

This receipt keeps the ritual lightweight and falsifiable:

- `CLAUDE.md` can stay small and act as a router.
- Topic docs can be reloaded only when relevant.
- Current authority is separated from stale/historical notes.
- `safe_to_edit=false` is allowed when the session cannot prove it is grounded.

Pair this with Pluribus' sync/audit workflow when file drift is the problem. Use this receipt when runtime grounding is the problem.
