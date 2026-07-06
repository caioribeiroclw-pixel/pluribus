# Evidence attestation Skill

`skills/evidence-attestation/` is a copyable Agent Skill for turning a claim into a small, privacy-safe proof object.

It exists because evidence-backed registries and agent-review workflows need more than a taxonomy label. A verifier needs a named procedure and a runnable check that show:

- what claim is being made;
- which evidence refs support or contradict it;
- which raw content was intentionally omitted;
- what verdict follows;
- what would make the evidence stale.

## Try it

```bash
node examples/evidence-attestation/check-evidence-attestation.mjs \
  examples/evidence-attestation/evidence-attestation.json
```

Expected output:

```text
✅ evidence attestation ok: 3 evidence refs, 4 claims, 3 supported, 1 unresolved, verdict review_required
   privacy ok: no raw prompts/transcripts/source/secrets/customer data copied
```

## Receipt type

The fixture uses:

```json
{
  "receipt_type": "pluribus.evidence_attestation.v1",
  "skill": "evidence-attestation",
  "verdict": "review_required"
}
```

Use `accepted` only when every required claim is supported. Otherwise use `review_required`, `rejected`, or `blocked`.

## What it does not prove

A passing checker run proves the attestation has the required structure and privacy booleans. It does **not** prove the underlying task, benchmark, memory answer, review, approval, or skill claim is correct. That remains the job of a human/verifier/downstream agent with access to the referenced artifacts.

## Why not just structured output?

Structured output can format anything. Evidence attestation is narrower: it requires a claim/evidence/verdict relation, explicit privacy omissions, limits, and stale invalidators. That makes it usable by registries, review gates, scoreboards, and handoff systems without copying raw private context.

## Files

- Skill: [`../skills/evidence-attestation/SKILL.md`](../skills/evidence-attestation/SKILL.md)
- Fixture: [`../examples/evidence-attestation/evidence-attestation.json`](../examples/evidence-attestation/evidence-attestation.json)
- Checker: [`../examples/evidence-attestation/check-evidence-attestation.mjs`](../examples/evidence-attestation/check-evidence-attestation.mjs)
