# MCP runtime config receipts

This example validates the live-vs-template boundary for MCP config review.

```bash
node check-mcp-runtime-config-receipt.mjs mcp-runtime-config-receipt.json
```

Expected output:

```text
mcp runtime config receipt ok: 3 configs checked, 1 runtime alert, 0 review-noise warnings
```

The alert is intentional: the live `.mcp.json` changes what Claude Code can load. The template and disabled config are quiet by default because they are not runtime-active.
