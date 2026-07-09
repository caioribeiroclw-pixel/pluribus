# Context hygiene receipt example

Validate an audit-before-prune receipt for a Claude Code/Cursor/MCP context cleanup run.

```bash
node examples/context-hygiene-receipts/check-context-hygiene-receipt.mjs \
  examples/context-hygiene-receipts/context-hygiene-receipt.json
```

The fixture proves source-by-source context load attribution, candidate removals, safety negative controls, review-before-cleanup, rollback, and privacy defaults without copying raw prompts, transcripts, source code, rule bodies, secrets, or customer data.

