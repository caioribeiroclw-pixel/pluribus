# Temporal context receipts

Use this when a long-lived AI coding project has old specs, ADRs, plans, or TODOs that still match grep but are no longer the current authority.

The goal is not to delete history or log raw project content. The goal is a tiny, privacy-safe receipt that proves the agent separated **current authority** from **historical citation** before it edits code.

This was prompted by a live `r/ClaudeCode` thread about the temporal problem in long-running projects: Claude Code can find every old plan, but grep is blind to time. If old docs do not carry status, date, and supersession metadata, the agent can treat a stale architecture note as current truth.

## Boundary to prove

For every coding run that reads design/context docs, capture a coarse receipt like this:

```json
{
  "receipt_type": "context.temporal_authority.v1",
  "request_id": "local-run-2026-05-28T16:00Z",
  "current_authority": {
    "file": "CURRENT_STATE.md",
    "status": "current",
    "as_of": "2026-05-28",
    "scope": "checkout-flow"
  },
  "sources_considered": [
    {
      "file": "specs/2025-checkout-rewrite.md",
      "status": "superseded",
      "superseded_by": "CURRENT_STATE.md#checkout-flow",
      "decision": "historical_citation_only"
    },
    {
      "file": "specs/2026-checkout-risk-notes.md",
      "status": "current",
      "scope": "checkout-flow",
      "decision": "allowed_as_supporting_context"
    }
  ],
  "ambiguous_sources": [],
  "write_started": true,
  "stopped_at": "temporal_authority_resolved"
}
```

Keep values coarse. Do not include source code, raw plans, prompts, transcripts, secrets, customer names, stack traces, private paths, or raw tool output.

## Minimal doc convention

Give every long-lived context file a small frontmatter header:

```markdown
---
status: current # current | superseded | archived
scope: checkout-flow
date: 2026-05-28
superseded_by: null
---
```

For old specs:

```markdown
---
status: superseded
scope: checkout-flow
date: 2025-11-10
superseded_by: ../CURRENT_STATE.md#checkout-flow
---
```

Then make `CURRENT_STATE.md` the short authority file an agent must read first:

```markdown
# Current state

## checkout-flow

- status: current
- as_of: 2026-05-28
- current authority: this section
- related historical specs:
  - specs/2025-checkout-rewrite.md (superseded)
  - specs/2026-checkout-risk-notes.md (current supporting context)

Agents may cite superseded specs for rationale, but must not implement from them unless the current authority explicitly reactivates that behavior.
```

## Agent preflight

Before editing code in a long-lived project, ask the agent to do this:

```markdown
## Temporal authority preflight

Before writing code:

1. Read `CURRENT_STATE.md` or the repo's current-state equivalent.
2. List design/spec/TODO/context files found for the requested scope.
3. Mark each source as `current`, `superseded`, `archived`, or `ambiguous`.
4. If any relevant source is `ambiguous` or lacks `superseded_by` while contradicting current authority, stop before writing.
5. Emit a `context.temporal_authority.v1` receipt with coarse file names/globs, status, decision, `write_started`, and `stopped_at`.
6. Only use superseded docs as historical citations, not as implementation authority.
```

Useful receipt markers:

- `context_current_authority`
- `historical_spec_citation`
- `status_superseded`
- `superseded_by_resolved`
- `ambiguous_temporal_source`
- `stale_source_ignored`
- `write_refused_until_authority_resolved`
- `preflight_temporal_decision`

## Where this catches failures

- Old spec matches grep, but has `status: superseded`: agent can cite it but should not implement from it.
- Old spec conflicts with `CURRENT_STATE.md` and has no `superseded_by`: agent should stop and ask for authority resolution.
- Multiple current files claim the same scope: agent should stop before writing.
- Current authority exists, but the run never read it: the receipt should show `stopped_at=current_authority_missing` or `write_started=false`.

## Try the copyable example

See [`examples/temporal-context-receipts/`](../examples/temporal-context-receipts/) for a minimal `CURRENT_STATE.md`, superseded spec, current supporting note, and receipt example.
