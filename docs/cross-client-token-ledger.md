# Cross-client token ledger

When the same model and visible prompt behave cheaply in one client and expensively through a bridge, do not start by blaming the model. First compare the client harnesses.

This came from a live Cursor/Zed ACP support pattern: Cursor-native Composer looked cheap, while Composer through Zed's Cursor ACP appeared to burn a much larger share of quota for a similar refactor. The useful artifact is a small ledger that separates:

- visible prompt tokens;
- hidden context attached by the client or bridge;
- tool schemas exposed/loaded;
- cacheable vs uncached input;
- tool calls and file reads;
- final diff size;
- privacy omissions, so the ledger proves shape without logging raw prompt or file content.

Try the packaged demo:

```bash
npx -y --package github:caioribeiroclw-pixel/pluribus pluribus demo cross-client-token-ledger --json
```

Expected decision: `investigate_bridge` when the bridge run uses much more total input for the same visible prompt and same final diff.

## Minimal bug-report shape

Ask for two fresh-chat runs on a tiny repo and record:

1. Client/mode: Cursor-native vs Zed-through-ACP, fast mode on/off, model name.
2. Prompt and fixture hashes, not raw content.
3. Auto-attached files and reasons.
4. MCP/tool schemas exposed and loaded.
5. Cache status and cacheable/uncached input.
6. Tool calls, file reads, changed files, final diff lines.
7. Reported input/output/total tokens or quota percent.

If the visible prompt and final diff are similar but hidden context, schemas, cache misses, or file reads diverge, the bug is likely in the harness/bridge/accounting layer rather than the user's task.
