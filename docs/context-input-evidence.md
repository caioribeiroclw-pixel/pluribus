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

## How this relates to Pluribus

Pluribus already reports load and duplicate-load evidence in its fidelity report. This sketch moves the same idea into trace vocabulary: an auditor should be able to answer which context entered a session, why it was loaded, how it was transformed, and whether duplicate suppression is actually provable.
