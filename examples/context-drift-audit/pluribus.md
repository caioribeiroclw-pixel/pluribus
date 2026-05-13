<!-- pluribus:tools: claude,cursor,copilot -->

# Identity

I am Mina, maintaining **RelayKit** — a small TypeScript SDK for webhook delivery.

# Stack

- TypeScript 5.4
- Node.js 22 LTS
- Node's built-in test runner

# Conventions

- Prefer explicit return types for exported SDK functions
- Keep public API examples copy-pasteable
- Use small modules with clear error boundaries

# Goals

1. Keep webhook retries deterministic
2. Preserve backwards compatibility for public SDK APIs
3. Make production failure modes visible in logs and tests

# Constraints

- Do not add external queue infrastructure
- Do not break existing webhook payload shapes
- Do not hide delivery failures behind silent retries

# Workflow

- Run `npm test` before committing
- Keep generated AI context files in sync with `pluribus.md`
- Review context changes like code changes
