# Package behavior receipts

Package sandboxes and MCP/security scanners can collect rich runtime evidence: processes, file writes, network calls, signatures, graphs, SARIF-style reports, and raw traces.

Pluribus' receipt layer is narrower. It gives an agent, CI job, reviewer, or permission gate a compact proof object before a dependency or MCP server becomes trusted authority.

## Try it

```bash
pluribus demo package-behavior-receipt --json
```

Bundled fixture: [`examples/package-behavior-receipts/package-behavior-receipt.json`](../examples/package-behavior-receipts/package-behavior-receipt.json)

## What the receipt proves

- **Target identity** — package/tool type, name, version, source, and artifact hash.
- **Sandbox policy** — mode, network policy, timeout, and image digest.
- **Evidence handles** — hashes for raw trace, graph, and report artifacts.
- **Observed behavior** — process/file/network/signature counts and safe shape labels.
- **Trust decision** — allow, review_required, or block, with confidence and human-review flag.
- **Privacy boundary** — raw syscalls, environment, secrets, and payloads are excluded from the model-visible receipt.

## Why not feed raw traces to the model?

Raw traces can contain paths, environment data, tokens, customer URLs, command arguments, and noisy syscall payloads. The receipt keeps the review object small and model-safe while preserving hashes back to the heavier evidence artifacts.

Use this when a workflow is about to cross from:

```text
untrusted package / MCP server → sandbox evidence → agent or CI trust decision
```

The receipt is not a malware verdict engine. It is the boundary artifact that records what evidence the verdict was based on.
