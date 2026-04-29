# @import ./shared/team-context.md
# @import ./shared/security-constraints.md

<!-- pluribus:tools: claude,cursor,openclaw -->

# Identity

I am Ana, building **Conduit** — a background job runner for Node.js applications.

Conduit users are backend developers who want simple, reliable background jobs without Redis or external infrastructure.

# Stack

- Node.js 22 LTS
- TypeScript strict mode
- SQLite for local persistence
- Node's built-in test runner

# Goals

1. Ship a small CLI-first MVP
2. Keep install size small
3. Make failures obvious and recoverable

# Workflow

- Run `npm test` before committing
- Use small PRs with one behavior change each
- Update examples when context behavior changes
