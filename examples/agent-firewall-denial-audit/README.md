# Agent firewall denial/audit example

This example turns an agent-firewall block into two privacy-safe artifacts:

- `denial-envelope.json` — what the model is allowed to see.
- `operator-audit-record.json` — what the operator/dashboard/CI can audit.

Run the checker:

```bash
node check-denial-audit.mjs .
```

The checker enforces the core invariant: blocks should be structured enough for the model to stop or ask for approval, but not detailed enough to reveal raw commands, secrets, private paths, or bypassable policy internals.
