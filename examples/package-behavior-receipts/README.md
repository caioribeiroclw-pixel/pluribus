# Package behavior receipt

A sandbox can capture detailed package/runtime behavior. A coding agent, CI gate, or reviewer usually should not ingest raw syscall logs, environment variables, file paths, or payloads.

This example keeps the model-visible artifact small:

- package identity and artifact hash;
- sandbox mode, network policy, timeout, and image digest;
- hashes for raw trace/graph/report artifacts;
- process, file, network, and signature counts/shapes;
- verdict and whether human review is required;
- explicit privacy defaults proving raw syscalls/env/secrets are excluded.

```bash
pluribus demo package-behavior-receipt --json
```

Use this shape beside tools such as package sandboxes, runtime behavior analyzers, MCP server scanners, or CI dependency gates. The raw trace remains available by hash; the agent gets the receipt.
