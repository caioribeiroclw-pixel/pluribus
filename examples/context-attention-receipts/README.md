# Context attention receipts

This example is for the `r/ClaudeCode` / GraphRAG failure mode: a graph, memory, RAG, or MCP retrieval system finds the right context, but the coding agent behaves as if it never saw it.

Pluribus should not replace graph memory, RAG, or MCP search. The useful boundary is smaller: emit a privacy-safe receipt proving whether selected context actually crossed the agent boundary and was treated as required before planning or editing.

## What the receipt proves

`pluribus.context_attention_receipt.v1` records low-cardinality evidence only:

- which retrieval/memory/tool context IDs were required for the task;
- which surface delivered them (`mcp_tool_response`, `claude_hook`, `CLAUDE.md`, `AGENTS.md`, etc.);
- whether the agent acknowledged those IDs before plan/edit;
- whether the final plan cites the IDs it depended on;
- whether missing context forced a stop instead of a best-effort edit;
- whether raw documents, prompts, source code, transcripts, tokens, or customer data were omitted.

It intentionally does **not** store the retrieved chunks themselves. Use stable IDs, hashes, coarse labels, and evidence paths instead.

## Smoke test

```bash
node examples/context-attention-receipts/check-attention-receipt.mjs \
  examples/context-attention-receipts/attention-receipt-pass.json

node examples/context-attention-receipts/check-attention-receipt.mjs \
  examples/context-attention-receipts/attention-receipt-fail.json
```

The first command should pass. The second should fail because the graph/memory result was retrieved but not acknowledged or cited before editing.

## Why this exists

A high-quality retrieval layer is still weak if the next agent turn can ignore it. The receipt makes that failure visible:

- retrieval succeeded;
- required context was or was not delivered to the agent surface;
- the agent did or did not acknowledge it before changing files;
- the wrapper/hook did or did not stop the run when required context was missing.

That is the narrow Pluribus angle: not more memory, not a new graph database, and not another router — evidence that the context boundary was actually crossed.
