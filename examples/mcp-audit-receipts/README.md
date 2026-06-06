# MCP audit receipt demo

This example validates a privacy-safe audit receipt for MCP `tools/call` activity.

Run from any directory after `pluribus-context@latest` is published:

```bash
npx --yes pluribus-context@latest demo mcp-audit-receipt
npx --yes pluribus-context@latest demo mcp-audit-receipt --json
```

Or validate your own receipt shape:

```bash
npx --yes pluribus-context@latest demo mcp-audit-receipt --receipt ./mcp-audit-receipt.json
```

The point is to split:

- **audit events**: correlation IDs, hashed user/token subject, token scopes, tool name, redacted argument shape, status, duration, result shape, and error class;
- **usage metrics**: low-cardinality counters/histograms such as tool name, status, and token scope;
- **privacy boundary**: no raw prompts, raw SQL, row data, tokens, tool outputs, or private connection strings in the receipt.

This is for MCP server/gateway operators who need to answer: “who invoked which tool, under what scope, and did it succeed?” without dumping sensitive content into logs.
