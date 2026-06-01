# Memory write policy receipt gate

Shared memory systems are useful when many agents can read the same durable facts. They become risky when every run can also write to that memory without review.

This example treats a memory write like a code change:

1. the agent proposes a memory diff;
2. the diff is scoped to a repo/project/org/user boundary;
3. the source is hashed instead of copied;
4. stale facts get an expiry or review date;
5. future sessions can see what memory was injected;
6. private/sensitive writes are quarantined until a human or external policy approves them.

Run the passing fixture:

```bash
node examples/memory-write-policy/check-memory-update.mjs \
  examples/memory-write-policy/approved-memory-update.json
```

Run the failing fixture:

```bash
node examples/memory-write-policy/check-memory-update.mjs \
  examples/memory-write-policy/quarantined-memory-update.json
```

Use this shape when evaluating cross-agent memory MCPs, knowledge graphs, or shared `CLAUDE.md`/`AGENTS.md` update flows. The point is not to store the memory body in the receipt. The point is to prove that a durable memory update had source, scope, lifecycle, visibility, approval, and privacy checks before it could teach every harness the same fact.
