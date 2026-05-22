# Context receipts for agent observability

Most agent observability stacks can already show spans for model calls, tool calls, latency, token counts, and sometimes prompt/tool bodies. That is useful, but it does not answer the context-engineering question directly:

> What context actually entered, changed, or stayed out of the agent run?

A **context receipt** is a small, privacy-first record that can join to OpenTelemetry traces without exporting raw prompts, memory bodies, tool arguments, secrets, or full transcripts.

This is not a stable Pluribus schema. It is a practical checklist for harness authors, MCP clients/servers, memory systems, and agent-skill/plugin maintainers who need inspectable evidence without making telemetry a data leak.

## When a receipt is useful

Use a receipt when the thing you need to debug is not only “which span was slow?” but one of these questions:

- Which project instructions, rules, or `AGENTS.md` overlays were loaded?
- Which skill/plugin body entered the prompt, and was it loaded lazily or upfront?
- Which MCP tool indexes were loaded at startup, and which full tool definition was expanded on demand?
- Which memory search results were returned, and which returned memories were actually inserted into context?
- Which context was compacted, summarized, dropped, or preserved hash-only?
- Which forget/delete candidates were confirmed and tombstoned without exposing the deleted memories?
- Which secret-scanning findings were shown and remediated without logging the secret itself?

If the answer requires raw content, the receipt is too invasive. The default should be identifiers, hashes, counts, buckets, categorical decisions, and explicit audit gaps.

## Receipt vs. trace span

Receipts should complement normal OpenTelemetry traces, not replace them.

- **Trace/span layer:** latency, errors, tool/model calls, correlation IDs, service ownership, retry timing.
- **Receipt layer:** compact evidence about context inputs and transformations: source identity, delivered identity, activation mode, policy decision, redaction posture, and known limitations.

A common shape is one agent/session span with receipt-like SpanEvents attached to it, plus normal child spans for model/tool calls. The receipt fields should include stable run/session/turn/tool identifiers so they can join back to normal traces.

## Minimal fields to consider

For context loaded into a run:

```json
{
  "name": "context.input.loaded",
  "attributes": {
    "session.id": "demo-session",
    "context.input.kind": "agent_instructions",
    "context.input.source.path_hash": "sha256:...",
    "context.input.source.bytes_hash": "sha256:...",
    "context.input.source.canonical.form": "nfc_lf.v1",
    "context.input.source.canonical.hash": "sha256:...",
    "context.input.delivered.hash": "sha256:...",
    "context.input.activation": "session_start",
    "context.input.loaded_by": "native-file-discovery",
    "context.input.scope": "repo",
    "context.input.duplicate.role": "selected",
    "context.input.audit_gap": "hashes prove identity, not semantic usefulness"
  }
}
```

For lazy MCP/tool loading:

```json
{
  "name": "mcp.tool_definition.loaded",
  "attributes": {
    "session.id": "demo-session",
    "mcp.server.hash": "sha256:...",
    "mcp.tool.name_hash": "sha256:...",
    "mcp.tool.definition.hash": "sha256:...",
    "mcp.tool.definition.token_bucket": "1k-2k",
    "mcp.tool.loading_strategy": "on_demand",
    "mcp.tool.audit_gap": "receipt proves expansion boundary, not selection optimality"
  }
}
```

For memory retrieval:

```json
{
  "name": "memory.search.returned",
  "attributes": {
    "session.id": "demo-session",
    "memory.provider": "mcp",
    "memory.query.hash": "sha256:...",
    "memory.result.count_bucket": "3-5",
    "memory.result.identity_hashes": ["sha256:...", "sha256:..."],
    "memory.snapshot.hash": "sha256:...",
    "memory.audit_gap": "server returned results; client receipt must prove what entered prompt"
  }
}
```

## Privacy defaults

Default to safe evidence:

- hashes for source/delivered text, queries, memory IDs, paths, tool arguments, and secrets;
- buckets for counts, token ranges, latency, score, and path/line ranges;
- categorical fields for activation, policy, status, suppression reason, and scope;
- explicit `audit_gap` text when the receipt proves only part of the story.

Avoid by default:

- raw prompt text;
- raw tool inputs/outputs;
- raw memory bodies;
- secrets or secret-like values;
- customer names, private repo paths, ticket text, or full transcripts;
- “debug mode” dumps that silently change the privacy posture.

If users opt into raw telemetry, keep that opt-in separate from privacy-safe receipts so teams can share receipts in issues, PRs, and incident reviews without leaking sensitive content.

## Runnable Pluribus examples

The executable fixtures live in [`examples/context-input-evidence/`](../examples/context-input-evidence/). They emit NDJSON receipts and OpenTelemetry-style trace JSON for:

- [`context.input.loaded`](context-input-evidence.md) for native files, generated fallbacks, and duplicate-load evidence;
- skill invocation and lazy skill-routing receipts;
- AGENTS.md base/overlay composition receipts;
- MCP Tool Search / deferred tool-definition loading receipts;
- memory search/load receipts;
- memory consolidation and governance/delete receipts;
- context compaction receipts;
- secret-scanning receipts for session-only findings.

Quick run:

```bash
node examples/context-input-evidence/generate-receipt.mjs
node examples/context-input-evidence/export-otel-trace.mjs
node examples/context-input-evidence/convert-mcp-tool-search-log.mjs
node examples/context-input-evidence/convert-memory-log.mjs
node examples/context-input-evidence/convert-compaction-log.mjs
```

The point is deliberately narrow: prove what crossed the context boundary, preserve enough identity to join with traces, and keep raw sensitive content out of the shared artifact.
