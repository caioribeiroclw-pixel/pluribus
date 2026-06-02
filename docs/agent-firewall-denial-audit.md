# Agent firewall denial/audit receipts

Claude Code hooks, OpenClaw policies, local MCP gateways, and agent firewalls can block destructive commands, outbound calls, or risky writes before an agent executes them.

The hard part is not only blocking. If the model sees a vague failure, it may keep trying variants. If the model sees too much detail, the denial can leak secrets, raw policy logic, or bypass hints.

Use a split receipt:

1. **Model-visible denial envelope** — minimal structured feedback the agent can act on safely.
2. **Operator audit record** — privacy-safe evidence for the human/operator, CI, or local dashboard.

## Model-visible denial envelope

The model should receive enough information to stop, ask, or choose a safe alternative, without exposing raw secrets, raw commands, or sensitive policy internals.

```json
{
  "type": "agent_firewall_denial.v1",
  "decision": "blocked",
  "reasonClass": "destructive_git",
  "requiresApproval": true,
  "safeAlternative": "Explain the planned git operation and wait for explicit approval.",
  "retrySafety": "unsafe_until_approved",
  "correlationId": "deny_2026_06_02_2200_7f3a"
}
```

Good `reasonClass` values are coarse and non-secret:

- `destructive_git`
- `filesystem_write_out_of_scope`
- `outbound_after_secret_read`
- `credential_exposure_risk`
- `package_publish_requires_approval`
- `unknown_policy_boundary`

The denial should avoid:

- raw shell commands;
- raw file contents;
- secret values or secret-looking substrings;
- full policy source;
- exact bypass instructions;
- absolute private paths when a path class or hash is enough.

## Operator audit record

The operator needs more detail, but still not raw prompts, code, or secrets. Prefer hashes, policy ids, classes, and booleans.

```json
{
  "type": "agent_firewall_operator_audit.v1",
  "decision": "blocked",
  "correlationId": "deny_2026_06_02_2200_7f3a",
  "tool": "Bash",
  "commandHash": "sha256:0e5751c026e543b2a6f2b4d7a7c8d8e5b81b69c5b9f7db2a5b94f31f987e7f44",
  "cwdHash": "sha256:dcdb704109a454784b81229d2b05f368692e758bfa33cb61d04c1b93791b0273",
  "matchedPolicyIds": ["git.destructive.requires_approval"],
  "sessionTaint": {
    "secretRead": false,
    "privateFileRead": true,
    "networkAccessed": false
  },
  "approval": {
    "state": "missing",
    "requiredFrom": "operator"
  },
  "retrySafety": "unsafe_until_approved",
  "modelEnvelopeHash": "sha256:a1bcaa1cb2572ab0e735c30062a268391d0a9d1b3dd7ff4b14065d8b29513b2a"
}
```

## Invariant

A blocked tool call should never disappear into the middle ground of “the command just failed.”

- The **model** gets a safe reason class and next action.
- The **operator** gets policy evidence and retry safety.
- The shared identifier is a correlation id plus hashes, not raw private payloads.

That makes enforcement auditable without turning policy internals into model-visible bypass material.

## Try the copyable example

See [`examples/agent-firewall-denial-audit/`](../examples/agent-firewall-denial-audit/) for a tiny denial envelope, operator audit record, and local checker:

```bash
node examples/agent-firewall-denial-audit/check-denial-audit.mjs examples/agent-firewall-denial-audit
```

The checker is intentionally small. It fails if the model-visible envelope leaks command/path/policy/secret-looking fields, if the audit record lacks policy ids or hash evidence, or if the envelope/audit correlation id does not match.

## How this fits Pluribus

Pluribus is not an agent firewall. This recipe is for teams already using hooks, policy engines, or local gateways and needing privacy-safe evidence at the enforcement boundary: what was denied, what the model was safely told, and what the operator can audit later.
