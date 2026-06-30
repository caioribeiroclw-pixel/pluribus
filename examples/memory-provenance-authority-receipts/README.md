# Memory provenance + authority-home receipts

Memory backends can find useful facts, but the agent still needs to prove which facts crossed the boundary and whether they were allowed to become authority.

This demo validates a privacy-safe receipt for a task that loads memory/search results next to authored project context. It checks that:

- every used claim points to an `authority_home` such as an ADR, release note, runbook, or repo file;
- stale/superseded memory is suppressed instead of used as authority;
- privacy omissions are explicit so reviewers know which raw data was intentionally left out;
- the next action is blocked unless required evidence exists.

Try it:

```bash
node check-memory-provenance-receipt.mjs safe-memory-provenance-receipt.json
node check-memory-provenance-receipt.mjs unsafe-memory-provenance-receipt.json
```

The safe sample exits `0`. The unsafe sample exits non-zero because it uses a stale memory item as authority and omits required provenance/privacy evidence.
