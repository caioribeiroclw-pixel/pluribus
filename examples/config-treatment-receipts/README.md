# Config treatment receipt example

Validate a privacy-safe receipt for a config-doctor run that canonicalized AI-agent rules into `AGENTS.md` and installed target stubs for Claude Code, Cursor, and Copilot.

```bash
node examples/config-treatment-receipts/check-config-treatment-receipt.mjs \
  examples/config-treatment-receipts/config-treatment-receipt.json
```

The fixture proves target files were loaded, records a drift gate, lists omitted private payloads, and names `stale_if` invalidators without copying raw rules, prompts, secrets, or customer data.
