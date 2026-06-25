# Company-memory export test

Enterprise agents and Slack-native assistants can become useful because they remember team decisions, exceptions, owners, and working constraints. That same memory becomes lock-in if a different vendor or agent cannot resume from a neutral bundle.

The boring test:

> Can a new vendor or agent reconstruct the active operating memory from an export bundle, without raw Slack history or hidden model memory?

A portable company-memory receipt should prove:

- decisions that are still active;
- constraints that must shape future actions;
- temporary exceptions and expiration dates;
- owners for policy/security/product/account questions;
- source freshness, especially stale or unknown policy docs;
- explicit `omitted_gaps` for private threads, hidden vendor memory, deleted sources, or data that should not cross the boundary.

It should not copy private chat history into the target agent. It should make negative space visible so the target agent knows when to stop, ask an owner, or request a scoped redacted excerpt.

## Try the packaged demo

```bash
npx -y -p pluribus-context@latest pluribus demo company-memory-export-test
npx -y -p pluribus-context@latest pluribus demo company-memory-export-test --json
```

The bundled receipt intentionally returns `decision=review_required` because one policy source is stale. That is the point: a transfer can be mostly portable while still unsafe to act on until a named owner refreshes the stale source.

## Minimal shape

```json
{
  "schema": "pluribus.company_memory_export_receipt.v1",
  "export_test": {
    "question": "Can a new vendor or agent resume without Slack history or hidden model memory?",
    "decision": "review_required"
  },
  "privacy_boundary": {
    "raw_chat_history_included": false,
    "hidden_model_memory_required": false,
    "hash_policy": "hashes_and_summaries_only"
  },
  "decisions": [],
  "active_constraints": [],
  "exceptions": [],
  "owners": [],
  "sources": [],
  "omitted_gaps": []
}
```

Use this when a company-memory tool, Slack agent, MCP memory server, or cross-agent brain claims portability. The receipt is not the memory store; it is the boundary proof that another agent can inspect before acting.
