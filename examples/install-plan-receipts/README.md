# Install-plan receipt example

This example is for one-command agent setup tools that configure MCP, Skills, instruction files, hooks, or plugins across multiple AI coding tools.

Use it when you want a setup script to prove what it will write before it writes anything.

## Copyable preflight checklist

Before applying installer changes, ask the agent or setup script to emit an `agent.install.plan.v1` receipt with:

- `agents_detected`
- `agents_selected`
- `planned_writes[]` with `kind`, `target`, `operation`, and `backup_planned`
- `external_commands_planned[]`
- `network_after_install`
- `writes_started=false`
- `next_safe_command`

Review the receipt, then run the apply command only if the planned writes match your intent.

## Smoke test

The sample receipt is intentionally static JSON so it can be inspected without running an installer:

```bash
cat examples/install-plan-receipts/agent-install-plan-receipt.json
node -e "const r=require('./examples/install-plan-receipts/agent-install-plan-receipt.json'); if (r.writes_started !== false) process.exit(1); console.log(r.receipt_type, r.planned_writes.length)"
```

Expected output:

```text
agent.install.plan.v1 3
```
