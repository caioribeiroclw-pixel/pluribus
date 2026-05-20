# Orchestration-layer search receipts

Search tools can report strong local savings while the whole agent task still gets more expensive: extra turns, repeated queries, insufficient snippets, or fallback full-file reads can erase the gain.

The receipt should live at the **orchestration / harness layer**, not inside a retrieval tool. The harness can see the task boundary, tool calls, follow-up reads, and whether the agent looped. A retrieval tool should not need to inspect the user's full task transcript or other tool traffic just to prove its value.

## Audience

Use this when evaluating code-search, MCP retrieval, RAG-over-notes, or agent memory tools inside Claude Code, Cursor, Codex, Copilot, Windsurf, OpenClaw, Continue, or custom harnesses.

## What to prove

A useful search receipt should answer:

- which task or session this evidence belongs to;
- which search/retrieval calls happened;
- how much context was returned to the agent;
- which files or notes were pointed to;
- whether the agent needed follow-up full reads;
- whether insufficient snippets caused repeated queries or extra loops;
- what data was intentionally omitted for privacy.

## Minimal JSON shape

```json
{
  "schema": "pluribus.orchestrationSearchReceipt.v0",
  "taskId": "optional-local-task-id",
  "createdAt": "2026-05-20T15:00:00Z",
  "orchestrator": {
    "name": "local-harness",
    "version": "0.1.0"
  },
  "privacy": {
    "storesPrompts": false,
    "storesResultText": false,
    "redaction": "paths-and-counts-only by default"
  },
  "retrievalTool": {
    "name": "example-search-tool",
    "mode": "mcp-or-cli"
  },
  "queries": [
    {
      "queryId": "q1",
      "queryHash": "sha256:...",
      "mode": "hybrid",
      "topK": 5,
      "returnedChunks": 5,
      "returnedChars": 4479,
      "estimatedTokensReturned": 1120,
      "resultFiles": ["src/auth.ts", "src/session.ts"],
      "candidateFileChars": 85000,
      "followUpFullReads": ["src/auth.ts"],
      "fallbackRecommended": false,
      "resultSufficiency": "partial"
    }
  ],
  "totals": {
    "searchCalls": 3,
    "returnedChars": 12000,
    "estimatedTokensReturned": 3000,
    "estimatedTokensAvoidedVsFullFiles": 42000,
    "followUpFullReadCount": 1,
    "repeatedQueryCount": 1
  },
  "limits": [
    "Does not prove end-to-end task success by itself.",
    "Pair with a transcript or eval harness when comparing agent-level quality/cost."
  ]
}
```

## Privacy defaults

Default to counts, hashes, paths, and tool-call metadata. Do **not** store prompts, raw result text, repository secrets, memory contents, or full transcripts unless the user explicitly opts in.

Good defaults:

- hash query text instead of storing it when the query may contain private details;
- keep paths relative and redact ignored/private directories;
- store byte/token counts instead of snippet bodies;
- store fallback/full-read counts, not file contents;
- make receipt output a local artifact unless the user chooses to publish it.

## Why this belongs above the search tool

A search tool can usually know `returnedChars`, `topK`, and result paths. It usually cannot know whether the agent then:

- asked the same question again;
- read entire files anyway;
- solved the task;
- paid more in turns than it saved in retrieval tokens;
- mixed results with other memory/context sources.

That evidence is visible to the orchestrator, agent harness, CLI wrapper, CI eval, or transcript analyzer. Keeping the receipt there avoids asking retrieval tools to become invasive observers of the whole workflow.

## How this relates to Pluribus

Pluribus already emits context-file fidelity/load evidence for upfront context files. This document extends the same principle to **retrieved context**: the useful claim is not "search returned fewer tokens" in isolation, but "this task received enough context with fewer full reads / fewer loops / acceptable privacy boundaries."

This is a sketch, not a stable schema. If an agent harness or search tool has a better receipt shape, open an issue or discussion with a concrete example.
