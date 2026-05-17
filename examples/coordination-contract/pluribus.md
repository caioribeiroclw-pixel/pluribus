<!-- pluribus:tools: claude,cursor,copilot,openclaw -->

# Identity

I am working on **Acme Platform**, a TypeScript/PostgreSQL product maintained by several AI coding sessions at the same time.

This repository may be edited from Claude Code, Cursor, GitHub Copilot, and OpenClaw-style terminal agents. Each session keeps its own context window, but all sessions must follow the same coordination contract.

# Stack

- TypeScript strict mode
- Node.js 22 LTS
- PostgreSQL
- Vitest for unit tests
- GitHub Actions for CI
- Runtime coordination substrate: append-only JSONL event log plus per-session status files

# Context

The runtime substrate is intentionally simple and inspectable:

- `.coordination/events.jsonl` is an append-only project event log.
- `.coordination/sessions/<session-role>.md` is the owned status file for one session role.
- `.coordination/offsets/<session-role>.json` records the last processed event offset for one session role.

Pluribus does not implement the event log, queue, wake mechanism, locks, or memory server. This file is the reviewed coordination contract that every generated AI instruction file receives.

# Conventions

- Treat `pluribus.md` as the source of truth for coordination rules.
- Do not edit generated `CLAUDE.md`, `.cursorrules`, Copilot instructions, or `AGENTS.md` by hand.
- The event log is append-only. Never rewrite, reorder, truncate, or silently redact past events.
- Each session may update only its own `.coordination/sessions/<session-role>.md` file.
- Prefer typed events over prose handoffs when a change affects another session.
- Keep event payloads small and structured. Put detailed work notes in the owning session status file or issue/PR.
- Use git, tests, and code review as final authority when AI context conflicts with source code.

# Coordination Contract

## Event schema

Every event appended to `.coordination/events.jsonl` should be one JSON object per line with:

- `schemaVersion`: currently `coordination.v1`.
- `eventId`: unique and stable for deduplication.
- `topic`: machine-readable topic such as `infra.endpoint.changed`, `db.migration.completed`, `api.contract.changed`, `authority.claimed`, `authority.released`, `worker.blocked`, or `release.published`.
- `producer`: session role that emitted the event.
- `createdAt`: UTC ISO timestamp.
- `projectVersion`: git SHA, package version, or config revision when emitted.
- `payload`: structured data with no secrets.
- `invalidates`: optional list of roles, plans, files, or assumptions that must be re-checked.

Example:

```json
{"schemaVersion":"coordination.v1","eventId":"2026-05-17T21:10:00Z-infra-1","topic":"infra.endpoint.changed","producer":"infra-session","createdAt":"2026-05-17T21:10:00Z","projectVersion":"a1b2c3d","payload":{"service":"postgres","endpointRef":"POSTGRES_ENDPOINT"},"invalidates":["api-session.plan","worker-session.plan","dashboard-session.plan"]}
```

## Required read topics

Before making or continuing a plan, every session must read from its last processed offset and check these topics:

- `infra.endpoint.changed`
- `db.migration.completed`
- `api.contract.changed`
- `authority.claimed`
- `authority.delegated`
- `authority.released`
- `release.published`
- `security.constraint.changed`
- `session.blocked`

If one of those topics invalidates the current plan, stop and re-plan before the next tool call.

## Authority and ownership

Shared definitions must have an explicit owner before parallel sessions edit them:

- `api-session` owns `openapi.yaml`, generated API clients, and API compatibility notes while an `authority.claimed` event for `api.schema` is active.
- `db-session` owns migrations and schema docs while an `authority.claimed` event for `db.schema` is active.
- `infra-session` owns deployment endpoints, secrets references, and runtime config names while an `authority.claimed` event for `infra.config` is active.
- Consumer sessions may read those files and adapt local code, but must not rewrite the shared contract unless authority is delegated.
- Authority should include `domain`, `owner`, `scope`, optional `expiresAt`, and optional `handoffTo` in the event payload.

Example:

```json
{"schemaVersion":"coordination.v1","eventId":"2026-05-17T22:10:00Z-api-owner-1","topic":"authority.claimed","producer":"api-session","createdAt":"2026-05-17T22:10:00Z","projectVersion":"a1b2c3d","payload":{"domain":"api.schema","owner":"api-session","scope":["openapi.yaml","packages/client/src/generated/**"],"expiresAt":"2026-05-17T23:10:00Z"},"invalidates":["dashboard-session.plan","worker-session.plan"]}
```

If two sessions claim the same authority domain, pause edits in that domain and resolve ownership before continuing.

## Allowed write topics

- `infra-session` may write `infra.*` and `release.*` topics.
- `db-session` may write `db.*` topics.
- `api-session` may write `api.*` topics.
- Any owner may write `authority.claimed`, `authority.delegated`, and `authority.released` for its own domain.
- `worker-session` may write `worker.*` topics.
- `dashboard-session` may write `dashboard.*` topics.
- Any session may write `session.blocked`, `session.unblocked`, and `session.question` for its own role.

Do not write events for another session role unless explicitly delegated in a ticket or coordinator message.

## Delivery semantics

- Treat event delivery as at-least-once.
- Deduplicate by `eventId`.
- Replay from the recorded offset when a session starts, resumes, or finishes compaction.
- If the offset file is missing or corrupt, replay from the start of the current day's events and summarize anything relevant before acting.
- If two events conflict, prefer the newer event only after checking whether both producers had authority over the topic.
- If two active authority claims overlap, stop editing the overlapping domain until ownership is resolved.

# Workflow

1. At session start or resume, read this contract and then read `.coordination/events.jsonl` from your recorded offset.
2. Before planning, process required read topics and update your session status file with current assumptions.
3. Before editing files, check whether another session status file claims the same area.
4. When you change a shared contract, endpoint, migration, API, release, or security constraint, append an event before continuing implementation.
5. When blocked, write `session.blocked` with a structured reason and the smallest question needed to unblock.
6. Before claiming completion, run the smallest meaningful test and `npx --yes pluribus-context@latest audit` if AI context files may have drifted.

# Goals

1. Remove the human as the message bus between parallel AI sessions.
2. Keep every session aligned on the same coordination protocol without exposing private reasoning or full transcripts.
3. Make stale assumptions visible before they cause conflicting edits or incorrect plans.
4. Keep the coordination layer boring, inspectable, and reviewable in git.

# Constraints

- Never put secrets, credentials, tokens, private customer data, or full chat transcripts in coordination files.
- Never paste raw chain-of-thought or private reasoning from another session.
- Do not use the event log as a durable memory database; store long-lived decisions in docs, issues, PRs, or an explicit memory tool.
- Do not continue implementation after receiving an invalidating event until the plan is refreshed.
- Do not assume every AI tool represents these rules identically; run `pluribus sync --dry-run` and review generated files when changing this contract.
