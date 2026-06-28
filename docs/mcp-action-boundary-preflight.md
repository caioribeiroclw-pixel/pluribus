# MCP action-boundary preflight

When MCP servers connect agents to Gmail, Calendar, Drive, Slack, browsers, or production admin APIs, the critical boundary is no longer only “which tool was visible?” It is whether the first tool use matches the user's intent before any real account state changes.

This packaged demo models a Gmail failure mode: the user asks to summarize unread mail, but the available MCP surface also exposes write-side tools such as `gmail.mark_read` or `gmail.batch_modify`. The safe response is not to log raw email or OAuth data. The safe response is a privacy-safe preflight that proves:

- account/resource and requested intent class;
- granted scopes and available tool action classes;
- proposed tool action class and maximum mutation count;
- dry-run / explicit-confirm defaults;
- revocation or rollback path;
- omitted raw subjects, bodies, sender addresses, and OAuth tokens.

Run it from GitHub main:

```bash
npx -y --package github:caioribeiroclw-pixel/pluribus pluribus demo mcp-action-boundary-preflight
npx -y --package github:caioribeiroclw-pixel/pluribus pluribus demo mcp-action-boundary-preflight --json
```

Expected verdict for the bundled receipt: `block`. A read-intent request is trying to use a write-class Gmail tool, so the agent must not mutate the inbox silently.

## Why this is different from MCP audit logs

Audit logs help after a tool call. Action-boundary preflight is before the first tool call that can mutate state. It should be small enough to show to a user or policy gate and redacted enough to paste into a bug report without leaking mailbox content or credentials.
