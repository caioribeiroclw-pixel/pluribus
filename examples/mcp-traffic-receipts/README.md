# MCP traffic receipt

This fixture models the output an MCP traffic proxy can hand to an agent, CI job, or reviewer without exposing raw JSON-RPC payloads.

It proves four things:

1. which client/server pair was observed in the real path;
2. which capability agreement hash was in force;
3. which tool calls completed, errored, or hung; and
4. which calls have replay evidence.

Try it:

```bash
pluribus demo mcp-traffic-receipt --json
```

Use this when raw MCP traces are too sensitive for model context, but the agent still needs a small artifact before trusting a tool, retrying a hung call, or widening permissions.
