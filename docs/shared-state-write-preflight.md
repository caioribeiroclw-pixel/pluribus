# Shared-state Write Preflight

Shared MCP databases and agent-readable systems of record are useful because Claude Code, Cursor, ChatGPT, and other clients can all write the same structured data. That also creates a sharper safety boundary: attribution after the write is not enough if any connected agent can mutate durable team state.

A shared-state write preflight proves the write boundary **before** mutation:

- which store/workspace/environment is targeted;
- which client/agent/human actor is requesting the write, by hash;
- which collection and operation will be touched;
- the authorization decision, policy version, allowed collections, write mode, idempotency key, and concurrency token;
- prompt-injection, secret, schema-migration, and trigger controls;
- redacted field shapes instead of raw records or raw prompts;
- source refs and the audit event that should be emitted if the write proceeds.

Try the packaged demo from the GitHub branch until the next npm publish includes it:

```bash
npx -y --package github:caioribeiroclw-pixel/pluribus pluribus demo shared-state-write-preflight
npx -y --package github:caioribeiroclw-pixel/pluribus pluribus demo shared-state-write-preflight --json
```

Use it when an MCP memory/database tool, shared team brain, ticket/CRM agent, or reactive agent platform claims “every client can write the same data.” The receipt is not the database. It is the small, pasteable proof that the next durable write is scoped, authorized, concurrency-safe, and privacy-bounded.
