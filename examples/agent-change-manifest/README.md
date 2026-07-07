# Agent change manifest example

This example shows the missing sidecar around an agent-written Git commit: not raw chat logs, but enough proof for a later human or agent to understand task intent, loaded authority, checks run, skipped checks, trailers, privacy flags, and staleness conditions.

```bash
node examples/agent-change-manifest/check-agent-change-manifest.mjs \
  examples/agent-change-manifest/agent-change-manifest.json
```

Use it when `git diff` is accurate but insufficient: the next reviewer needs to know what context governed the agent and what would make the change unsafe to resume.
