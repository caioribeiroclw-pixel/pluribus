# Pluribus Context Format Spec

**Version:** 0.1.0-draft
**Status:** Draft
**Date:** 2026-03-08

---

## Overview

The Pluribus context format defines a single, human-readable Markdown file — `pluribus.md` — that serves as the authoritative source of truth for AI tool context in a project. From this one file, Pluribus generates all tool-specific files (CLAUDE.md, .cursorrules, AGENTS.md, etc.) without duplication or drift.

This spec defines the structure, sections, parsing rules, and conventions for `pluribus.md`.

---

## File Location

**Primary (flat):** `pluribus.md` in the project root.
**Structured (multi-file):** `pluribus/context.md`, `pluribus/identity.md`, `pluribus/skills.md`, `pluribus/rules.md`

When both exist, the structured form takes precedence. The flat form is recommended for single-developer projects; the structured form for teams with complex contexts.

This spec covers the flat form. The structured form follows the same section rules, distributed across files.

---

## Canonical Sections

A `pluribus.md` file is composed of top-level Markdown headings. Each heading is a **section**. Sections are case-sensitive and must be level-1 headings (`#`).

### Required Sections

| Section | Purpose |
|---|---|
| `# Identity` | Who the project owner is; the agent/AI persona if applicable |
| `# Stack` | Technology stack: language, framework, tooling, infrastructure |
| `# Conventions` | Code style, patterns, naming rules, workflow expectations |
| `# Goals` | What this project is trying to achieve; what matters most |
| `# Constraints` | Hard rules — what the AI must never do |

All five required sections must be present for a valid `pluribus.md`.

### Optional Sections

| Section | Purpose |
|---|---|
| `# Examples` | Concrete code snippets or interaction examples |
| `# Anti-patterns` | Patterns that look reasonable but should be avoided in this project |
| `# Workflow` | Development workflow: branching, PRs, testing, deployment |
| `# Context` | Background the AI needs to understand the project domain |
| `# Team` | Team members, roles, areas of ownership |

Optional sections may appear in any order after the required sections.

---

## Section Specification

### `# Identity`

Who you are, what the project is, and (if applicable) the AI persona to adopt.

**Guidelines:**
- Keep this concise — 3–10 lines
- Include: your name or team name, the project name, the project's purpose in one sentence
- If the project uses an AI agent with a defined persona, describe it here

**Example:**
```markdown
# Identity

I am Carlos, a solo developer building **Velo** — a lightweight task manager for developers who live in the terminal.

Velo is a TypeScript CLI tool. Users are developers. They value speed and simplicity over features.
```

---

### `# Stack`

The full technical picture of the project.

**Guidelines:**
- List language + version, frameworks, key libraries, test tools, linter/formatter, infrastructure
- Be specific — "TypeScript 5.4" is better than "TypeScript"
- Include what is intentionally excluded (e.g., "no ORM — raw SQL via `postgres` driver")

**Example:**
```markdown
# Stack

- **Language:** TypeScript 5.4 (strict mode)
- **Runtime:** Node.js 22 LTS
- **Framework:** None — pure Node CLI
- **Testing:** Jest 29 + ts-jest
- **Linting:** ESLint (flat config) + Prettier
- **Package manager:** pnpm
- **CI:** GitHub Actions
- **No ORM** — raw SQL via `postgres` driver
```

---

### `# Conventions`

How code is written in this project. This section directly shapes AI behavior during code generation and review.

**Guidelines:**
- Be opinionated and explicit
- Cover: async patterns, error handling, naming conventions, file structure, forbidden patterns
- Prefer positive rules ("always X") over vague ones ("use good naming")

**Example:**
```markdown
# Conventions

- Always use `async/await` — never `.then()/.catch()` chains
- No class-based code — use plain functions and closures
- Error handling: never swallow errors silently; always propagate or log
- File naming: `kebab-case.ts`
- Exports: named exports only — no default exports
- Tests: one `describe` block per module; test file lives next to the source file
- No `any` — use `unknown` and narrow types explicitly
- Prefer `const` over `let`; never `var`
```

---

### `# Goals`

What this project is optimizing for. Helps the AI make trade-off decisions.

**Guidelines:**
- List 3–7 goals in priority order
- Be specific to this project — not generic engineering virtues
- Include product goals, not just technical goals

**Example:**
```markdown
# Goals

1. Ship fast — the project is pre-launch; velocity matters more than perfection
2. Keep the codebase small and readable — a new contributor should understand the whole codebase in 30 minutes
3. Zero runtime dependencies where possible — this is a CLI tool; bloat matters
4. 100% type coverage — TypeScript strict mode, no escape hatches
5. Developer experience over user customizability
```

---

### `# Constraints`

Hard rules. What the AI must never do, regardless of context.

**Guidelines:**
- State constraints clearly and firmly
- Include security, architectural, and process constraints
- These map directly to AI tool guardrails

**Example:**
```markdown
# Constraints

- Never introduce new dependencies without explicit confirmation
- Never use `eval`, `Function()`, or dynamic `require()`
- Never write to the filesystem outside of designated output directories
- Never delete or overwrite files without a dry-run option
- Never use class-based patterns — not even for error types (use plain objects + type guards)
- Do not modify `package.json` or lock files autonomously
```

---

### `# Examples` (optional)

Concrete code that shows what "good" looks like in this project. The AI uses these as style references.

**Guidelines:**
- Include 1–3 representative examples
- Show the pattern, not just the syntax
- Label each example clearly

---

### `# Anti-patterns` (optional)

Patterns that look acceptable but should be avoided in this specific project.

**Guidelines:**
- Each entry: name the pattern, explain why it's banned here
- Keep it short — this is a warning list, not a tutorial

---

## Parsing Rules

Pluribus parses `pluribus.md` using the following rules:

1. **Section detection:** A section starts at any level-1 heading (`# Heading`) and ends at the next level-1 heading or EOF.
2. **Section content:** Everything between the heading and the next `#` heading is the section body. Subheadings (`##`, `###`) within a section are preserved as-is.
3. **Unknown sections:** Any section not in the canonical list is preserved and passed to skills as `extra.<section-slug>`.
4. **Whitespace:** Leading and trailing whitespace within a section body is trimmed.
5. **No execution:** Pluribus never executes code blocks inside `pluribus.md`. They are treated as literal text.
6. **Encoding:** UTF-8. Files with BOM are supported but the BOM is stripped.

---

## Validation

A valid `pluribus.md` must:

- [ ] Contain all 5 required sections
- [ ] Have each required section non-empty (at least one non-whitespace line)
- [ ] Be valid UTF-8
- [ ] Have no duplicate top-level section names

Run `pluribus validate` to check your file.

---

## Full Example

Below is a complete, realistic `pluribus.md` for a Node.js TypeScript project.

```markdown
# Identity

I am Ana, building **Conduit** — a background job runner for Node.js applications.

Conduit lets you schedule, retry, and monitor background jobs without a Redis dependency.
Target users: backend developers who want a simple, reliable job queue without infrastructure overhead.

# Stack

- **Language:** TypeScript 5.4 (strict mode, no `any`)
- **Runtime:** Node.js 22 LTS
- **Framework:** Fastify 4 (HTTP API for the dashboard)
- **Database:** SQLite via `better-sqlite3` (embedded; no external DB required)
- **Testing:** Jest 29 + ts-jest + Supertest
- **Linting:** ESLint (flat config) + Prettier (2-space indent, single quotes)
- **Package manager:** pnpm 9
- **CI:** GitHub Actions — lint + test on every PR
- **No Redis, no RabbitMQ, no external message broker**

# Conventions

- Always `async/await` — no `.then()/.catch()`
- No classes — all logic is plain functions; data is plain objects with explicit types
- Error handling: create typed error objects (`{ code, message, cause }`); never throw strings
- File structure: `src/core/` for domain logic, `src/api/` for HTTP handlers, `src/db/` for DB layer
- Named exports only — no default exports
- Test files: `*.test.ts` co-located with source; each test file has one top-level `describe`
- Database access: only through functions in `src/db/` — no raw SQL in core or API layers
- No `process.exit()` in library code — only in the CLI entrypoint

# Goals

1. Zero external infrastructure — Conduit should work with just Node.js and a file path
2. Type safety end-to-end — every public API is fully typed
3. Readable codebase — optimized for new contributors to get up to speed in < 1 hour
4. Reliable job delivery — retry logic and failure tracking are first-class, not afterthoughts
5. Minimal API surface — fewer methods, more composable

# Constraints

- Never introduce a dependency that requires native compilation (no native addons)
- Never write to disk outside of the configured data directory
- Never skip tests for a PR — CI must pass; no `--no-verify`
- Do not use `any` — use `unknown` with type narrowing
- Do not use class syntax — not even for custom errors
- Never auto-migrate the database schema — migrations are explicit and versioned

# Examples

## Defining a job handler

```typescript
import type { JobHandler } from '../types.js'

export const sendWelcomeEmail: JobHandler<{ userId: string }> = async (job) => {
  const user = await getUser(job.data.userId)
  await emailService.send({
    to: user.email,
    template: 'welcome',
  })
}
```

## Scheduling a job

```typescript
const jobId = await queue.enqueue('send-welcome-email', {
  data: { userId: 'usr_123' },
  runAt: new Date(Date.now() + 5000),
  maxRetries: 3,
})
```

# Anti-patterns

- **God functions:** Functions > 50 lines are a sign something should be extracted
- **Implicit any via `JSON.parse`:** Always assert the shape with a type guard after parsing
- **Shared mutable state:** No module-level variables that accumulate state across requests
- **Catching and re-throwing without context:** Always add `cause` when wrapping errors
```

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| 0.1.0-draft | 2026-03-08 | Initial draft |