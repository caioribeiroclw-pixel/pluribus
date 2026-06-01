# Memory write policy receipts

Cross-agent memory tools usually optimize recall: make Claude Code, Codex, Cursor, OpenClaw, ChatGPT, or MCP clients find the same facts later.

The adoption risk is different: **who is allowed to write durable memory, under what scope, and with what rollback or review path?**

Pluribus should not become another memory server. This receipt is a small governance layer for shared memory systems: every durable memory update is treated like a proposed diff before it becomes trusted context for future agents.

## Receipt boundary

A memory write receipt should prove:

- **source** — where the proposed memory came from, with a hash/ref instead of raw transcript or raw memory body;
- **scope** — whether the write is repo, project, org, or user scoped;
- **proposed diff** — adds/updates/supersedes/expires by stable refs and hashes;
- **write policy** — proposed, approved, rejected, or quarantined; who/what approved it;
- **lifecycle** — expiry or review date so stale facts do not become immortal;
- **injection visibility** — future sessions can see which memory was injected;
- **privacy flags** — no raw prompts, raw tool output, raw memory text, or secrets in the receipt.

## 60-second gate

The copyable example is in [`examples/memory-write-policy/`](../examples/memory-write-policy/):

```bash
node examples/memory-write-policy/check-memory-update.mjs \
  examples/memory-write-policy/approved-memory-update.json

node examples/memory-write-policy/check-memory-update.mjs \
  examples/memory-write-policy/quarantined-memory-update.json
```

The first passes because the write is approved, scoped, hashed, visible to future sessions, and has a review lifecycle. The second fails because it tries to turn a quarantined, broad user-scoped, private/sensitive update into durable shared memory and includes raw text.

## Positioning

Memory systems remember. Hooks and workflow engines execute. This receipt answers a narrower review question:

> Is this memory update allowed to become durable context for other agents?

That makes shared memory safer without requiring the memory provider to expose private content or the agent transcript.
