# Agent runtimes vs context receipts

Agent runtimes, memory servers, workflow harnesses, and cross-tool launchers are converging fast. They manage what an agent **can** do: route tasks, spawn workers, page context, call MCP servers, enforce approvals, persist memory, and keep workspaces alive.

Pluribus is narrower. It produces privacy-safe evidence for what context **actually crossed an agent boundary**.

Use this page when you are comparing Pluribus with tools like cross-harness runtimes, MCP memory servers, Claude Code skills, Cursor/Codex workflows, durable workspaces, RAG-over-notes, or agent OS experiments.

## The boundary test

Ask one question before adding another memory/runtime layer:

> If a reviewer joins after the run, can they see what context was loaded, deferred, omitted, summarized, delegated, or made stale — without reading the raw transcript?

If not, the stack has control surfaces but weak auditability.

## What each layer owns

| Layer | Owns | Good evidence | Pluribus should not own |
| --- | --- | --- | --- |
| Runtime / harness | Tasks, workers, approvals, tool grants, phases, retries | Run IDs, phase transitions, model/tool grants, stop reasons | Scheduling or orchestration |
| Memory / RAG / knowledge graph | Retrieval, durable facts, embeddings, note/code search | Query IDs, returned chunk IDs, freshness, citation coverage | Long-term fact storage |
| MCP / tool catalog | Tool discovery, schema visibility, server health | `tools/list`, selected tools, withheld tools, first invocation | Serving the tools |
| Skills / rules / instruction packs | Reusable policy and workflows | Installed, discovered, attached, invoked, refused | Skill marketplace governance |
| Workspace / filesystem layer | Durable files, mounts, cache, sync/flush | Changed paths, flush status, omitted/sensitive paths | Remote filesystem or volume hosting |
| Pluribus receipts | Boundary auditability | Loaded/deferred/omitted sources, freshness, privacy flags, exact handoff envelope | Replacing the runtime, memory server, or tool host |

The useful integration point is simple: let the runtime do the work, then emit a receipt that proves what crossed the boundary.

## Minimal receipt shape

A runtime, memory server, or workflow harness can attach a receipt like this before a risky edit, resume, delegation, or review handoff:

```json
{
  "receipt_kind": "context_boundary",
  "boundary": "parent_agent_to_worker",
  "run_id": "run_2026_06_25_1300",
  "loaded_sources": [
    { "kind": "instruction_file", "id": "CLAUDE.md", "freshness": "reloaded" },
    { "kind": "memory_result", "id": "mem:checkout-flow:42", "freshness": "retrieved_now" }
  ],
  "deferred_sources": [
    { "kind": "mcp_tool_schema", "id": "billing.full_catalog", "reason": "not needed for task" }
  ],
  "omitted_sources": [
    { "kind": "transcript", "reason": "raw transcript not included" }
  ],
  "handoff": {
    "goal": "verify checkout retry behavior",
    "allowed_scope": ["src/checkout/**", "tests/checkout/**"],
    "required_evidence": ["test command", "files read", "known gaps"]
  },
  "privacy": {
    "raw_transcript_included": false,
    "source_contents_included": false,
    "secrets_scanned": true,
    "customer_data_included": false
  }
}
```

The receipt is not a transcript. It is a small accountability object: enough for another agent or human reviewer to decide whether the next action is safe, partial, or blocked.

## When Pluribus is the right tool

Use Pluribus when the question is:

- Did this context file, skill, MCP catalog, memory result, compaction summary, or handoff packet actually reach the run?
- Which sources were available but deferred, withheld, stale, or unused?
- Can a reviewer audit the boundary without exposing prompts, raw code, customer data, tool output, or the full transcript?
- Can a workflow gate decide `safe_to_continue`, `needs_review`, or `unsafe_to_resume` from evidence instead of self-attestation?

Do **not** use Pluribus as the runtime, memory database, RAG system, vector index, or agent scheduler. Pair it with those systems when they need boundary evidence.

## 60-second check

In any repo with AI context files, run:

```bash
npx --yes pluribus-context@latest audit --json --fidelity-report
```

Then inspect the output for three things:

1. `native` vs `generic` surfaces — did the target tool get first-class context, or a fallback?
2. loaded/deferred/unused evidence — did context cross the boundary, or merely exist somewhere?
3. privacy posture — can you review the result without dumping raw instructions, prompts, or transcripts?

If the answer is unclear, the stack may have memory/runtime features but still lack boundary auditability.
