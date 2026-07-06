# Memory answer receipts

Memory servers, GraphRAG, repo indexes, and knowledge graphs can answer broad questions like “where is this implemented?” without forcing the main coding agent to re-read the whole repository. That is useful — but the answer should not silently become authority.

A **memory answer receipt** is the small artifact a memory/RAG tool can emit after answering and before the agent uses the answer to edit, delete, publish, or file a conclusion.

## Try it

```bash
pluribus demo memory-answer-receipt --json
```

Bundled fixture: [`examples/memory-answer-receipts/memory-answer-receipt.json`](../examples/memory-answer-receipts/memory-answer-receipt.json)

## What it proves

- which memory system/tool answered (`ask_live_memory`, RAG, graph, notes, etc.);
- the redacted query hash and intended use;
- the snapshot / ledger reference and freshness window;
- answer hash, cited refs, and claim statuses (`supported`, `needs_verification`, `stale`, `rejected`);
- whether the answer may be used as `orientation`, `authority`, or must be `blocked`;
- private omissions and payload policy;
- `stale_if` invalidators and a concrete verification path.

## Boundary

The boundary is:

> retrieved or accumulated memory answer → allowed authority for the next agent action

This is narrower than “persistent memory.” Pluribus does not decide how memory is stored or retrieved. It asks memory systems to export enough evidence that another agent or human can decide whether the answer is only orientation, verified authority, or unsafe.

## When to use it

Use this receipt when:

- a live memory server tells the agent where code lives before the first patch;
- a RAG system summarizes project decisions that may have gone stale;
- a knowledge graph produces facts that could become durable documentation;
- a memory answer would save tokens but the agent still needs a replayable verification path.

Do **not** use it as proof that the memory system is correct. It is proof of what the answer claimed, what it cited, what it omitted, and what would make it stale.
