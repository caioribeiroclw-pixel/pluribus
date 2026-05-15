# Discovery smoke checks

Pluribus has two different discovery surfaces:

1. **Registry metadata** (`npm view`) — updates quickly after publish.
2. **Search indexes** (`npm search`, GitHub search) — update more slowly and rank results differently per query.

Use this smoke when changing package keywords, repository topics, description copy, review packet copy, or distribution strategy:

```bash
npm run discovery:smoke
```

The script intentionally separates hard checks from observation:

- hard check: `npm search pluribus-context` should rank `pluribus-context` at position `0`;
- observation: generic queries such as `ai context sync`, `claude code context sync`, `context-sync ai-rules claude-md`, and `rules-sync context-files ai-agents` report rank/top results without failing;
- observation: GitHub repository search reports whether `caioribeiroclw-pixel/pluribus` appears for package/problem queries.

The JSON output is meant to be pasted into activity logs without exposing secrets or local project context.

## Current baseline

As of 2026-05-15 19:00 UTC, after `pluribus-context@0.3.9`:

- `npm search pluribus-context` ranks Pluribus at position `0`.
- Generic npm queries still favor adjacent packages such as `sync-ai-context`, `ai-rules-sync`, `cursor2claude`, and `@intellectronica/ruler`.
- That means exact-name discovery works, but problem-query discovery is still weak and should be treated as a lagging adoption metric.

Do not publish a new package only because a generic search index has not caught up. Recheck later, then change metadata or distribution copy only if the missing query is still strategically important.
