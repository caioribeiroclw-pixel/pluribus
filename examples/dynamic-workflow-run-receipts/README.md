# Dynamic workflow run receipt example

This example is a copyable privacy-safe receipt for Claude Code-style dynamic workflows, ultracode runs, local LLM gateway orchestration, or any script that spawns several subagents to audit, migrate, research, or verify a codebase.

Use it when the parent session only sees the final report, but reviewers still need to understand:

- which phases ran;
- how many agents were spawned;
- which role/model/provider each agent actually used;
- which context was loaded, skipped, or suppressed;
- which tools/capabilities were granted and used;
- how token spend was bucketed;
- where each agent stopped;
- which gaps remain before mutation or merge.

The example intentionally uses coarse labels, buckets, and hashes instead of raw prompts, source code, exact paths, transcripts, tool output, secrets, or customer data.

See [`docs/dynamic-workflow-run-receipts.md`](../../docs/dynamic-workflow-run-receipts.md) for the checklist and field rationale.
