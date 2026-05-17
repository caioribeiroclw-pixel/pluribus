# Coordination contract for multi-session agents

Use this when several Claude Code, Cursor, Copilot, OpenClaw, or terminal-agent sessions work on the same project and you need them to follow the same coordination rules.

Pluribus is not an event bus, queue, memory server, or orchestrator. It can hold the **coordination contract**: the small, reviewable protocol that tells every session what shared state exists, which events matter, who owns what, and when stale context must be invalidated.

The pattern pairs well with tools that provide the runtime substrate: MCP memory servers, append-only JSONL logs, Discord/channel plugins, SQLite queues, task ledgers, dashboards, or custom schedulers. Those tools move messages; Pluribus keeps the rules for reading and writing those messages consistent across AI tools.

## Audience

This guide is for developers who:

- run multiple AI coding sessions on the same repo or related repos;
- use one tool for planning and other sessions for implementation;
- keep hitting the "human as message bus" problem;
- already use, or are considering, an event log, scratchpad, memory server, task ledger, or channel plugin;
- want every agent/session to validate the same protocol before acting.

If you need real-time wake, pub/sub delivery, session discovery, locks, or durable retrieval, use a coordination/memory tool. If you need the instruction contract for those tools to stay aligned across Claude Code, Cursor, Copilot, OpenClaw, Windsurf, Continue, and Zed, use Pluribus.

## 60-second disposable test

```bash
mkdir coordination-contract-demo
cd coordination-contract-demo
curl -fsSL https://raw.githubusercontent.com/caioribeiroclw-pixel/pluribus/main/examples/coordination-contract/pluribus.md -o pluribus.md

npx --yes pluribus-context@latest validate
npx --yes pluribus-context@latest sync --dry-run
```

The dry run previews the tool-specific instructions before writing files:

| Tool/session surface | Generated file |
| --- | --- |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| OpenClaw / agent runners | `AGENTS.md` |

If the preview is correct:

```bash
npx --yes pluribus-context@latest sync
npx --yes pluribus-context@latest audit
```

Commit `pluribus.md` as the reviewed source of truth. Commit generated files if you want each tool to pick up the contract immediately after clone.

## What belongs in a coordination contract

A useful contract is small and operational. Keep it explicit enough that a fresh session can follow it without reading the whole project history.

```markdown
<!-- pluribus:tools: claude,cursor,copilot,openclaw -->

# Identity
I am working on Acme Platform, a repo edited by multiple AI sessions.

# Context
The runtime coordination substrate is an append-only event log at `.coordination/events.jsonl` plus one owned status file per session under `.coordination/sessions/`.

# Workflow
1. Before planning, read `.coordination/events.jsonl` from your last processed offset.
2. Before editing files, check session status files for active ownership of the same area.
3. When you change a shared contract, append an event before continuing implementation.
4. If an event invalidates your current plan, stop and re-plan before the next tool call.

# Constraints
- Do not paste secrets or private chat logs into coordination files.
- Do not rewrite the append-only event log.
- Do not edit another session's owned status file.
```

The important point is not the exact file names. The important point is that all sessions agree on the same protocol: event schema, ownership model, invalidation rules, and safety boundaries.

## Authority is part of the contract

Multi-session workflows usually fail before the transport fails. Two sessions can both receive the same event and still drift if they disagree about who owns a shared definition.

Make authority explicit:

- which role owns each shared contract: API schema, database migration, deployment config, design token, generated client, release branch;
- whether ownership is exclusive, delegated, or review-only;
- which event transfers ownership or requests a handoff;
- what a session must do when it sees another active owner for the same area;
- how cross-repo or cross-machine sessions identify the same project/version.

For example:

```json
{"schemaVersion":"coordination.v1","eventId":"2026-05-17T22:10:00Z-api-owner-1","topic":"authority.claimed","producer":"api-session","createdAt":"2026-05-17T22:10:00Z","projectVersion":"a1b2c3d","payload":{"domain":"api.schema","owner":"api-session","scope":["openapi.yaml","packages/client/src/generated/**"],"expiresAt":"2026-05-17T23:10:00Z"},"invalidates":["dashboard-session.plan","worker-session.plan"]}
```

A session that sees this event should not edit the same schema or generated client until it either receives an `authority.released` event, gets explicit delegation, or replans around a read-only dependency.

## Suggested contract fields

For an append-only project event log, define at least:

- `schemaVersion`: version of the event schema;
- `eventId`: stable unique id for deduplication;
- `topic`: machine-readable topic such as `infra.endpoint.changed`, `db.migration.completed`, or `authority.claimed`;
- `producer`: session id or role that emitted the event;
- `createdAt`: timestamp;
- `projectVersion`: git SHA, package version, or config revision when emitted;
- `payload`: structured data, excluding secrets;
- `invalidates`: optional list of plans, files, or roles that must re-check state.

For each session role, define:

- topics it **must read before planning**;
- topics it **may write**;
- files, domains, schemas, or contracts it owns;
- events that claim, delegate, release, or revoke authority;
- when it must pause and ask the coordinator/human;
- whether event delivery is `at-least-once`, `replay from offset`, or best effort;
- how to record the last processed offset.

## Example: migration updates an endpoint

Bad handoff:

> Session A changed the database endpoint. The user copy-pastes that fact into four other terminals.

Better handoff:

```json
{"schemaVersion":"coordination.v1","eventId":"2026-05-17T21:10:00Z-infra-1","topic":"infra.endpoint.changed","producer":"infra-session","createdAt":"2026-05-17T21:10:00Z","projectVersion":"a1b2c3d","payload":{"service":"postgres","endpointRef":"POSTGRES_ENDPOINT"},"invalidates":["api-session.plan","worker-session.plan","dashboard-session.plan"]}
```

The contract then tells API, worker, and dashboard sessions: before the next plan/tool call, read events from your offset; if `infra.endpoint.changed` appears, invalidate cached assumptions about database endpoint configuration and re-check the canonical env/config source.

## Why this is separate from memory

Memory tools store facts and retrieve relevant history. Coordination tools deliver events and track state. The contract is the layer that says **how sessions are allowed to use those tools**.

Separating those layers prevents a common failure mode: five sessions use the same memory/event substrate with five subtly different conventions. The result looks like flaky coordination, but the root cause is protocol drift.

## What this deliberately does not solve

- It does not wake sleeping sessions.
- It does not provide pub/sub, locks, or a queue.
- It does not read another session's private reasoning or transcript.
- It does not replace MCP memory, task systems, dashboards, or event logs.
- It does not make multi-agent coordination safe by itself.

That boundary is intentional. Pluribus keeps the coordination protocol reviewable and synced; runtime systems execute it.

## Feedback wanted

If this breaks in a real multi-session workflow, the most useful feedback is concrete:

- which tools/sessions were involved;
- what runtime substrate you used: event log, memory server, channel, task ledger, or custom queue;
- which contract rule drifted or was ignored;
- whether `pluribus audit` caught stale generated instructions;
- what field should be added to make the contract more executable.

Open feedback here: https://github.com/caioribeiroclw-pixel/pluribus/discussions/13
