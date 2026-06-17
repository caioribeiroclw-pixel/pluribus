# Session preflight receipts

Cursor Forum users are asking for a "required first tool" or pre-tool hook so an agent cannot skip required project context before Grep, Shell, Write, or MCP calls. A behavioral rule is not enough: the first useful question is whether the session actually initialized its context before work began.

A **session preflight receipt** is a small, privacy-safe record produced before any side-effecting agent work. It does not log raw memory, prompts, secrets, or file contents. It records which required context sources were checked, which tool surfaces were available, and whether the agent is allowed to proceed.

Use this when rules like "read `MEMORY.md` first" or "call `session_init` before work" are important enough to audit.

## Minimal receipt

```json
{
  "schema": "pluribus.session_preflight_receipt.v1",
  "session_id": "local-2026-06-17T11:00Z",
  "client": "cursor",
  "required_first_step": {
    "kind": "mcp_tool",
    "name": "session_guard.session_init",
    "enforcement": "behavioral_rule_only"
  },
  "required_context": [
    {
      "id": "project-memory",
      "path": "MEMORY.md",
      "status": "loaded",
      "fingerprint": "sha256:example-non-secret-digest"
    }
  ],
  "tool_surface": {
    "mcp_servers_seen": ["session-guard", "playwright"],
    "side_effecting_tools_blocked_until_preflight": ["Shell", "Write"]
  },
  "decision": {
    "allowed_to_start_work": true,
    "mode": "read_then_patch",
    "reason": "required context was checked before tool use"
  }
}
```

## What this proves

- The agent had an explicit preflight gate before work.
- Required context sources were checked or clearly missing.
- Side-effecting tools were blocked, downgraded, or allowed for a reason.
- A reviewer can tell whether the run began from known project context or from blind rediscovery.

## What this does not prove

- It is not an authorization decision.
- It does not prove the model fully understood the context.
- It does not replace Cursor, Claude Code, or MCP-native enforcement.
- It does not require logging private memory content.

## Failure modes to record

```json
{
  "schema": "pluribus.session_preflight_receipt.v1",
  "decision": {
    "allowed_to_start_work": false,
    "mode": "read_only",
    "reason": "required context missing or session_init skipped"
  },
  "failures": [
    {
      "kind": "required_context_missing",
      "id": "project-memory",
      "path": "MEMORY.md"
    }
  ]
}
```

The key distinction: **a required first tool is the enforcement hook; the receipt is the evidence that the hook actually ran before work.**

See `examples/session-preflight-receipts/` for a copyable Cursor-style rule and JSON fixture.
