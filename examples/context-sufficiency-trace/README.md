# Context sufficiency trace

Tiny fixture for the market signal that token-saving context tools need a second metric: did the agent receive the files it later needed?

The example compares a retrieval/context-bundle trace against task ground truth and reports:

- `gold_context_recall`: required files returned before the edit;
- `missed_required_file_rate`: required files not returned by the bundle;
- `late_context_rate`: required files first discovered after the edit started;
- `frontier_cut_misses`: required files that were seen as candidates but cut from the bundle.

Run it:

```bash
node examples/context-sufficiency-trace/check-context-sufficiency.mjs \
  examples/context-sufficiency-trace/ground-truth.json \
  examples/context-sufficiency-trace/context-trace.json
```

Expected result for the included fixture: fail. The bundle saved tokens, but it missed `src/auth/session.ts`, which was required for the task and only appeared after editing began.

Why this exists: score + token savings can hide a bad context bundle. A sufficiency trace turns the hidden failure into something benchmarkable before a team trusts compression.
