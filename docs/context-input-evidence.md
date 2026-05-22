# Context input evidence for agent traces

Agent traces can show model calls, tool calls, token counts, and sometimes prompt/tool content. They still need a small privacy-first receipt for **context inputs**: instructions, rules, skills, memory snippets, and retrieved context that entered the agent session.

This document is a sketch for people evaluating OpenTelemetry/agent-observability traces, not a stable Pluribus schema.

## What changed from the naive shape

A single `content.hash` is not enough for cross-tool context evidence. The same source file can be normalized, templated, stripped, merged, or rendered differently before it reaches the model.

Use separate identities:

- `source.bytes_hash` — hash of the source bytes on disk or at the URI. Use this for forensic identity.
- `source.canonical.form` + `source.canonical.hash` — hash after a named canonical form, such as `otel.context.source.nfc_lf.v1_candidate`. The form identifier is part of the comparison key. A hash without the canonical form can silently compare different vendor policies.
- `delivered.hash` — hash of what the harness believes was actually delivered to the model after template expansion, stripping, generated headers, merge/render steps, or clipping. Use this for “what did the model see?” evidence.
- `delivered.full_render.hash` + `delivered.full_render.status` — hash of the full rendered payload before context-window clipping, when the harness materialized it. If the harness clipped at ingest and never materialized the full render, set status to `unavailable_not_materialized` and do not treat an empty hash as evidence.
- `delivered.template_hash` — hash of the deterministic template or render recipe, when generated headers or timestamps make `delivered.hash` unstable. A template hash can group candidates, but it should not automatically suppress events unless the suppression policy says that is conformant.

Without that split, a `duplicate.dedupe_key` can silently lie: two tools may start from byte-identical `AGENTS.md`, then deliver different text after template expansion, normalization, generated headers, or truncation.

## SpanEvent, not child span

Context loads usually happen as events on a session/agent span, especially at session start or resume. They are not always request/response operations.

A practical modeling default:

- one agent/session span;
- `context.input.loaded` events for upfront/native/hook/manual context;
- normal LLM call/tool call spans keep their existing token and latency attributes;
- retrieval/search receipts can be linked from the session span or emitted by the local harness.

This avoids inflating traces with one child span per context file while still preserving structured evidence.

## Minimal event shape

```json
{
  "name": "context.input.loaded",
  "time": "2026-05-20T17:00:00.000Z",
  "attributes": {
    "context.input.kind": "agent_instructions",
    "context.input.source.path": "AGENTS.md",
    "context.input.source.bytes_hash": "sha256:...",
    "context.input.source.canonical.form": "otel.context.source.nfc_lf.v1_candidate",
    "context.input.source.canonical.hash": "sha256:...",
    "context.input.delivered.hash": "sha256:...",
    "session.id": "demo-session-context-input-evidence",
    "context.input.delivered.full_render.hash": "sha256:...",
    "context.input.delivered.full_render.status": "available",
    "context.input.delivered.template_hash": "sha256:...",
    "context.input.delivered.nondeterministic": "false",
    "context.input.delivered.truncated": "false",
    "context.input.loaded_by": "native-file-discovery",
    "context.input.activation": "session_start",
    "context.input.scope": "repo",
    "context.input.applies_to": "codex",
    "context.input.why_loaded": "shared invariant guidance",
    "context.input.expected_benefit": "align agent behavior with repository conventions",
    "context.input.duplicate.dedupe_key": "session:sha256:...",
    "context.input.duplicate.dedupe_scope": "session",
    "context.input.duplicate.suppression_policy": "suppress_equal_dedupe_key_within_scope",
    "context.input.duplicate.role": "selected",
    "context.input.duplicate.risk": "unknown"
  }
}
```

## Session and suppression boundaries

`session` is not a portable word by itself. Cursor may mean conversation lifetime, Claude Code may mean one CLI invocation, and a long-lived harness may mean the root trace. Emit an explicit session identity such as `session.id` (or the closest existing OTel/session attribute) and define `context.input.duplicate.dedupe_scope` relative to it. Without that boundary, `dedupe_scope=session` becomes another vendor-specific metadata field.

For nondeterministic delivery, be conservative. If `delivered.nondeterministic=true`, the default policy should be `keep_distinct_template_hash_is_candidate_only`: `delivered.template_hash` can say two deliveries came from the same recipe, but it does not prove the delivered payloads are interchangeable. A harness that wants to collapse those events should emit an explicit suppression policy.

For truncation, distinguish “known full render” from “unknown full render”. `delivered.full_render.status=unavailable_not_materialized` means the harness clipped before constructing the full payload; consumers must not read a missing/empty full-render hash as “the full render was empty” or “the clipped hash is the full render”.

## Privacy defaults

Default to paths, hashes, counts, and categorical fields. Do **not** record raw prompt text, raw skill text, memory contents, tool arguments, secrets, or full transcripts unless the user explicitly opts in.

If paths are sensitive, hash or redact them. If the delivered text could contain secrets, keep only `delivered.hash` and counts.

## Try the executable demo

The example in [`examples/context-input-evidence/`](../examples/context-input-evidence/) simulates multiple harnesses loading the same `AGENTS.md`:

- Claude Code-like native load: reads bytes as-is.
- Codex-like load: expands `{{repo_root}}` before delivery.
- Cursor-like generated fallback: injects the same source under a generated header.

Run:

```bash
node examples/context-input-evidence/generate-receipt.mjs
```

It writes `receipt.ndjson` and prints a summary showing five failure modes:

1. `source.bytes_hash` can match while `delivered.hash` diverges.
2. A canonical hash is only comparable when the `source.canonical.form` identifier also matches.
3. Generated headers/timestamps can make `delivered.hash` non-deterministic, so `delivered.template_hash` may be needed.
4. A clipped payload needs both `delivered.hash` and `delivered.full_render.hash`, because dedupe at clip-length N does not prove the full render was identical.
5. A harness that clips at ingest may have `delivered.full_render.status=unavailable_not_materialized`; consumers should keep those events distinct unless a later receipt proves a shared full render.

That is why `source.*`, `delivered.*`, canonical form, truncation status, explicit session identity, dedupe scope, and suppression policy should be explicit in any agent trace convention.

To see the same receipts as OpenTelemetry-style trace data, run:

```bash
node examples/context-input-evidence/export-otel-trace.mjs
```

It reads `receipt.ndjson` and writes `otel-trace.json` with one `agent.session` span and six `context.input.loaded` SpanEvents. The fixture keeps the default privacy posture: paths, hashes, categorical fields, session identity, full-render status, and suppression policy; no raw prompt text, raw skill text, secrets, memory contents, or transcript bodies.

To test the post-hoc observability path — closer to tools that reconstruct Claude Code/Cursor/Codex sessions from JSONL logs — run:

```bash
node examples/context-input-evidence/convert-session-log.mjs
```

It reads `sample-session-log.jsonl` and writes both `session-receipt.ndjson` and `session-otel-trace.json`. The sample session includes one upfront `AGENTS.md` load, one MCP-memory retrieval result, and two tool calls. The exported receipt keeps only paths/URIs, hashes, counts, categorical fields, and session/conversation identifiers. It intentionally does **not** copy raw context text, prompts, memory contents, tool arguments, secrets, or transcript bodies into the receipt/trace.

To test skill/plugin observability — where a skill is prompt-like context, not a normal MCP/tool call — run:

```bash
node examples/context-input-evidence/convert-skill-log.mjs
```

It reads `skill-invocation-log.jsonl` and writes `skill-receipt.ndjson` plus `skill-otel-trace.json`. The sample covers one manual slash-command skill invocation, one post-commit hook-driven skill load, and one duplicate skill candidate suppressed from a global cache. The emitted `context.skill.invoked` events include activation mode, hook event, skill/plugin identity, source and delivered hashes, suppression policy, expected benefit, and an explicit `eval_gap`. They do **not** copy raw skill text, raw prompt text, tool arguments, memory contents, or transcripts.

That split matters for Claude/Cowork-style telemetry: tool spans can prove MCP/tool calls happened, but skills may be expanded as invisible prompt context. A useful receipt should show both “which skill was invoked?” and “what prompt-like context entered the session?” without requiring raw skill bodies in the OTEL stream.

To test agent-specific `AGENTS.md` overlays — where a shared base file is combined with one target-specific file such as `AGENTS.cursor.md`, `AGENTS.codex.md`, or another future standard — run:

```bash
node examples/context-input-evidence/convert-agent-overlay-log.mjs
```

It reads `agent-overlay-log.jsonl` and writes `agent-overlay-receipt.ndjson` plus `agent-overlay-otel-trace.json`. The sample emits two loaded context inputs (`AGENTS.md` base + `AGENTS.cursor.md` overlay) and one suppressed candidate (`AGENTS.codex.md`) for a Cursor session. The receipt records source role, target agent, load order, composition policy, fallback policy, expected benefit, source/delivered hashes, and suppression reason. It does **not** copy raw instruction text, prompt text, tool arguments, secrets, or transcripts.

This is the evidence shape needed for an overlay standard: naming files is not enough. Reviewers need to know which base and overlay were loaded, in what order, which agent they applied to, and which non-target overlays were suppressed.

To test deferred MCP Tool Search / tool loading — where many MCP servers are connected but full tool definitions should only load on demand — run:

```bash
node examples/context-input-evidence/convert-mcp-tool-search-log.mjs
```

It reads `sample-mcp-tool-search-log.jsonl` and writes `mcp-tool-search-receipt.ndjson` plus `mcp-tool-search-otel-trace.json`. The sample emits four event types:

- `mcp.tool_index.loaded` — each connected MCP server's tool-name index, startup loading strategy, tool count, index token bucket, and proof that full definitions were not loaded at startup.
- `mcp.tool_search.performed` — query hash, candidate-count bucket, selected server/tool hashes, selection policy, and how many full definitions were expanded.
- `mcp.tool_definition.loaded` — the single full tool definition loaded on demand, with definition hash and token bucket.
- `mcp.tool_call.completed` — call status, argument/result hashes, result-count bucket, and the audit gap that receipts prove the loading boundary, not selection optimality.

This is for Claude Code/MCP context-budget work where Tool Search reduces context bloat but still needs verifiable boundaries. The receipt should prove “only indexes were loaded up front; this one definition was loaded when needed; private query/arguments/results stayed out of the trace.”


To test GitHub MCP secret scanning receipts — where an agent asks the GitHub MCP server to scan current changes before commit or PR, and findings may exist only in the agent session rather than as persisted GitHub alerts — run:

```bash
node examples/context-input-evidence/convert-secret-scanning-log.mjs
```

It reads `sample-secret-scanning-log.jsonl` and writes `secret-scanning-receipt.ndjson` plus `secret-scanning-otel-trace.json`. The sample emits five event types:

- `security.secret_scanning.requested` — trigger, toolset/tool, scan scope, diff-path hash, prompt hash, push-protection customization, and whether findings were persisted as GitHub alerts.
- `security.secret_scanning.completed` — status, scanned file/count buckets, detector count, finding count, engine snapshot, latency bucket, and tool-response hash.
- `security.secret_scanning.finding.presented` — redacted finding identity, secret type, severity, path/line buckets, secret hash, remediation hash, push-protection action, and bypass policy.
- `security.secret_scanning.bypass.evaluated` — policy identity, bypass request/allowance, decision, and operator-note hash.
- `security.secret_scanning.remediation.verified` — rescan identity, clean status, changed-path hash, finding count after remediation, rotation-ticket hash, and the explicit audit gap that a clean rescan does not prove external secret revocation finished.

This is for AI coding agents that run secret scanning via MCP before commit/PR. A useful receipt should prove “the scan ran, these redacted findings were shown, the bypass policy was evaluated, and a clean rescan happened” without exporting raw secrets, private paths, prompts, tool responses, ticket text, or customer data.

To test shared-memory and MCP recall flows — where Cursor, Claude Code, and other clients may all query the same memory backend — run:

```bash
node examples/context-input-evidence/convert-memory-log.mjs
```

It reads `sample-memory-retrieval-log.jsonl` and writes `memory-receipt.ndjson` plus `memory-otel-trace.json`. The sample emits two event types:

- `memory.search.returned` — what the memory layer returned: provider, client, query hash, project hash, result count, result identity hashes, score bucket, snapshot hash, and latency.
- `context.input.loaded` — what the client/harness actually loaded from those results: memory/result identity hashes, delivered hash, activation, scope, expected benefit, duplicate role, and suppression policy.

The split is intentional. A shared-memory server can prove “these memories were returned for this query/snapshot,” but only the client or harness can prove “this returned memory entered the prompt/context.” The fixture redacts raw query text, raw memory text, prompts, tool arguments, secrets, and transcript bodies from the receipt/trace.

To test self-remediating memory/knowledge-graph flows — where a brain runs a doctor/autopilot/repair pass with a target score and budget cap — run:

```bash
node examples/context-input-evidence/convert-brain-remediation-log.mjs
```

It reads `sample-brain-remediation-log.jsonl` and writes `brain-remediation-receipt.ndjson` plus `brain-remediation-otel-trace.json`. The sample emits four event types:

- `brain.doctor.precheck.completed` — the before score, issue count/category hash, and before-snapshot hash.
- `brain.doctor.remediation.plan.selected` — the selected plan identity, step count, spend bucket, expected score delta, and whether protected phases are involved.
- `brain.doctor.remediation.job.evaluated` — each submitted, skipped, or refused job with kind, status, protected-phase flag, spend bucket, changed-entity count, and refusal/skip reason.
- `brain.doctor.remediation.completed` — the final score/outcome, submitted/skipped/refused counts, cost bucket, after-snapshot hash, and privacy flags.

This is for systems that let agents maintain their own memory or knowledge graph. The receipt should prove pre-check → plan → jobs → cost boundary → post-check without exposing raw brain pages, graph nodes, plan text, candidate deletes, operator notes, or transcripts.

To test long-session context compaction — where an agent drops, summarizes, or preserves old instructions/tool results/memory under context-window pressure — run:

```bash
node examples/context-input-evidence/convert-compaction-log.mjs
```

It reads `sample-compaction-log.jsonl` and writes `compaction-receipt.ndjson` plus `compaction-otel-trace.json`. The sample emits three event types:

- `context.compaction.started` — reason, trigger, token-window bucket, and a hashed before-objective.
- `context.compaction.item.evaluated` — item kind/source/semantic role, action (`preserved`, `summarized`, `dropped`, or `preserved_hash_only`), token bucket, drop reason, and raw-text hash.
- `context.compaction.completed` — after-token bucket, summary hash, after-objective hash, item counts, and the explicit audit gap that semantic equivalence is not proven without eval.

This is for reliability/auditability work where users need to know whether the original engineering objective survived compaction. The receipt should prove the compaction boundary and item decisions without exposing raw prompts, private instructions, tool outputs, memory bodies, summaries, customer data, or transcripts.

To test incremental memory consolidation — where a shared-memory server runs a hook-safe pass after a session and turns several recent memories into one consolidated memory with lineage — run:

```bash
node examples/context-input-evidence/convert-memory-consolidation-log.mjs
```

It reads `sample-memory-consolidation-log.jsonl` and writes `memory-consolidation-receipt.ndjson` plus `memory-consolidation-otel-trace.json`. The sample emits four event types:

- `memory.consolidation.precheck` — trigger, horizon, last-run cursor, candidate count, candidate identity hash, and proof that raw paths/candidate text are not recorded.
- `memory.consolidation.cluster.selected` — strategy, source-count, source identity hash, topic hash, similarity bucket, and source-age bucket.
- `memory.consolidation.output.created` — consolidated memory identity, lineage edge, output content hash, quality-score buckets, changed-entity count/hash, and no raw memory body.
- `memory.consolidation.completed` — candidate/cluster/consolidated/skipped counts, duration bucket, latency budget, status, next-cursor hash, and the explicit audit gap that the receipt proves bounded execution and lineage, not summary correctness.

This is for MCP/shared-memory systems that want `incremental` or Stop-hook consolidation without scanning the full corpus. The useful receipt should prove “the hook ran under budget over these recent candidates and produced this lineage-preserving consolidation” without exposing memory contents, customer data, project paths, secrets, or operator notes.

To test memory governance deletion — where a persistent memory layer exposes a forget/delete skill or MCP tool and needs to prove two-step confirmation without leaking the memory bodies — run:

```bash
node examples/context-input-evidence/convert-memory-governance-delete-log.mjs
```

It reads `sample-memory-governance-delete-log.jsonl` and writes `memory-governance-delete-receipt.ndjson` plus `memory-governance-delete-otel-trace.json`. The sample emits five event types:

- `memory.governance.delete.requested` — request identity, trigger, scope, delete policy, query/reason hashes, sensitive-class hash, and project-path hash.
- `memory.governance.delete.candidates.presented` — candidate-count bucket, candidate identity hash, preview policy, preview hash, and whether explicit confirmation is required.
- `memory.governance.delete.confirmation.recorded` — confirmation identity, channel, confirmed/rejected candidate hashes, and operator-note hash.
- `memory.governance.delete.completed` — deleted/retained/tombstone counts and hashes, audit-entry identity, before/after store snapshot hashes, status, and latency bucket.
- `memory.governance.audit.completed` — replay result count, tombstone/retained counts, retention policy, and the explicit audit gap that receipts do not prove physical compaction or backup expiry.

This is for persistent memory systems and forget skills where deletion needs to be safe, explainable, and shareable in bug reports. A useful receipt should prove “these candidates were shown, these exact identities were confirmed, these identities were tombstoned/deleted, and the replay no longer returns them” without exposing raw delete queries, memory bodies, private paths, customer data, or operator notes.

To test skill routing benchmark evidence — where an agent or plugin marketplace loads a cheap description index, routes activation cases, and expands full skill bodies only after selection — run:

```bash
node examples/context-input-evidence/convert-skill-routing-log.mjs
```

It reads `sample-skill-routing-log.jsonl` and writes `skill-routing-receipt.ndjson` plus `skill-routing-otel-trace.json`. The sample emits four event types:

- `skill.router.index.loaded` — catalog identity, skill count, description-index hash, token buckets, startup strategy, and proof that full skill bodies were not loaded up front.
- `skill.router.case.evaluated` — per-case prompt hash, expected/selected skill hashes, top-k hash, match tier, confidence bucket, and reason hash.
- `skill.body.loaded` — selected skill identity hash, body hash, load reason, and proof that body expansion happened after routing.
- `skill.router.benchmark.completed` — usable/format-failure counts, top-1/top-2 buckets, model-results hash, next-action hash, and the explicit audit gap that routing correctness is not the same as task effectiveness.

This is for Claude Code/plugin/agent-skill ecosystems where skill routing and lazy loading reduce prompt bloat but still need verifiable boundaries. A useful receipt should prove “these skill descriptions were available, this skill won for this activation case, this full body expanded after routing, and private prompts/skill bodies stayed out of the trace.”

## How this relates to Pluribus

Pluribus already reports load and duplicate-load evidence in its fidelity report. This sketch moves the same idea into trace vocabulary: an auditor should be able to answer which context entered a session, why it was loaded, how it was transformed, and whether duplicate suppression is actually provable.
