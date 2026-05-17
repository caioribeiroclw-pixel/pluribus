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
- observation: `publicPackage` reports the currently published npm package, while `localPackage` reports the checked-out `package.json`, so release prep can tell whether search/download evidence is measuring the live package or an unpublished local version;
- observation: `pendingNpmPublish`, `npmLatestMatchesLocal`, `localDescriptionPublished`, and `unpublishedKeywordCount` summarize the public-vs-local release gap before interpreting generic search visibility;
- observation: npm download counts for `last-day`, `last-week`, and `last-month` are included so adoption signals can be logged alongside search visibility;
- observation: generic queries such as `ai context sync`, `claude code context sync`, `context-sync ai-rules claude-md`, and `rules-sync context-files ai-agents` report rank/top results without failing;
- observation: GitHub repository search reports whether `caioribeiroclw-pixel/pluribus` appears for package/problem queries;
- observation: GitHub repo signals include stars, forks, watchers, latest release, open issues, open pull requests, and recent discussions so adoption loops can distinguish search visibility from real feedback;
- observation: recent discussion comment authors and an `externalRecentDiscussionComments` summary separate maintainer-only updates from real external feedback.
- observation: tracked external distribution PRs, such as contextual awesome-list submissions, report state/mergeability/comments so manual distribution experiments can be measured without opening multiple submissions blindly.

The JSON output is meant to be pasted into activity logs without exposing secrets or local project context. Download counts can include local smoke/release installs, GitHub counts can lag indexing, and discussion comment author windows are capped to recent comments, so treat them as directional unless there is external corroboration such as new stars, issues, replies, or third-party mentions.

## Current baseline

As of 2026-05-17 01:01 UTC, public npm is still `pluribus-context@0.3.9` while the local checkout is preparing `0.3.10`:

- `npm search pluribus-context` ranks Pluribus at position `0`.
- `pendingNpmPublish` is expected to be `true` until npm auth/2FA allows publishing `0.3.10`; generic search results still measure the public `0.3.9` metadata, not the sharpened local `0.3.10` description/keywords.
- npm downloads are visible through the same smoke report (`last-day`, `last-week`, `last-month`), but current values still include likely noise from release/publish/smoke activity.
- GitHub adoption signals are visible in the same report: stars/forks/watchers, latest release, open issues, open pull requests, discussion activity, and recent external discussion-comment count.
- External distribution tracking starts with the contextual `awesome-ai-coding-tools` PR and records whether it remains open, mergeable, commented on, or merged.
- Generic npm queries still favor adjacent packages such as `sync-ai-context`, `ai-rules-sync`, `cursor2claude`, and `@intellectronica/ruler`.
- That means exact-name discovery works, but problem-query discovery is still weak and should be treated as a lagging adoption metric, especially while `pendingNpmPublish` is true.

Do not publish a new package only because a generic search index has not caught up. Recheck later, then change metadata or distribution copy only if the missing query is still strategically important. When `pendingNpmPublish` is true, publish/auth state must be resolved before treating local metadata changes as live discovery evidence.
