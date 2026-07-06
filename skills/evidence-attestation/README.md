# Evidence attestation Agent Skill

This is a copyable Agent Skill for cases where an agent, human reviewer, registry, benchmark, or approval gate needs proof of a claim without exposing private logs.

Copy `SKILL.md` into a local skill registry such as:

- `.claude/skills/evidence-attestation/SKILL.md`
- `.opencode/skills/evidence-attestation/SKILL.md`
- `.agents/skills/evidence-attestation/SKILL.md`

Then ask the agent to emit `pluribus.evidence_attestation.v1` for a concrete claim.

## Quick smoke

```bash
node examples/evidence-attestation/check-evidence-attestation.mjs \
  examples/evidence-attestation/evidence-attestation.json
```

The checker validates required fields, verdict/status enums, evidence refs, privacy booleans, omissions, limits, and stale-if invalidators. It intentionally does not require raw prompts, transcripts, source files, secrets, customer data, tool output, memory bodies, or MCP schemas.

Related context:

- [`docs/context-boundary-receipt-taxonomy.md`](../../docs/context-boundary-receipt-taxonomy.md)
- [`docs/memory-answer-receipts.md`](../../docs/memory-answer-receipts.md)
- [`docs/parallel-session-review-ledger.md`](../../docs/parallel-session-review-ledger.md)
