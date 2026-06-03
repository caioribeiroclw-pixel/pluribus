# Phase-boundary contracts for multi-model coding workflows

Use this when a coding workflow routes work through phases such as **Explore → Propose → Spec → Design → Tasks → Apply → Verify**, especially when different tools or models handle different phases.

The problem is not only “which model is best for this step”. The failure mode is handoff: a plan agent burns context, a build agent receives a lossy summary, a verifier cannot tell which decisions are current, and stale assumptions leak from one phase into the next.

A phase-boundary contract makes every transition explicit:

- what input context was allowed into the phase;
- what artifact the phase had to produce;
- what evidence is required before the next phase may start;
- what context must not be carried forward;
- which stop conditions require human review or a fresh phase run.

This keeps Pluribus out of the orchestration layer. The workflow runner can be OpenCode, Claude Code, Cursor, OpenClaw, Codex, a local script, or a human checklist. Pluribus supplies the evidence shape.

## Contract shape

```json
{
  "schema": "pluribus.phase-boundary-contract.v1",
  "workflowId": "checkout-refactor-2026-06-03",
  "currentPhase": "apply",
  "nextPhase": "verify",
  "allowedInput": [
    {
      "kind": "approved_plan",
      "ref": "plans/checkout-refactor.md",
      "contentHash": "sha256:...",
      "required": true
    }
  ],
  "outputArtifact": {
    "kind": "patch",
    "ref": "git:working-tree",
    "contentHash": "sha256:..."
  },
  "evidenceGate": {
    "requiredBeforeNextPhase": ["changed_files", "tests_run", "open_risks", "stop_conditions"],
    "status": "pass"
  },
  "droppedContext": [
    {
      "kind": "exploration_transcript",
      "reason": "not authoritative after approved plan"
    }
  ],
  "stopConditions": []
}
```

## Minimum fields

| Field | Why it exists |
| --- | --- |
| `workflowId` | Correlates phase records without storing a transcript. |
| `currentPhase` / `nextPhase` | Makes the handoff boundary explicit. |
| `allowedInput[]` | Prevents the next model from inheriting stale scratch context accidentally. |
| `outputArtifact` | Names the thing this phase produced: plan, spec, task list, patch, review, or verification report. |
| `evidenceGate.requiredBeforeNextPhase[]` | Forces the phase to prove the minimum facts the next phase depends on. |
| `droppedContext[]` | Records what intentionally did **not** cross the boundary. |
| `stopConditions[]` | Lets the workflow stop instead of laundering uncertainty into the next model. |

## Apply → Verify is the strictest boundary

For coding workflows, the most useful hard gate is often between Apply and Verify. The verifier should receive a compact evidence packet, not a vague “I implemented it” summary:

- decision implemented;
- source/plan hash used;
- changed files or file-set hash;
- tests/commands run with pass/fail state;
- open risks and skipped checks;
- whether secrets, schema migrations, data writes, or external calls were touched;
- explicit stop condition if verification cannot be trusted.

## Privacy boundary

Do not put raw source, prompts, transcripts, secrets, full command output, absolute local paths, or customer data in the contract. Use stable refs, hashes, counts, risk classes, and short non-secret labels.

## Try it

```bash
cd examples/phase-boundary-contract
node check-phase-boundary.mjs phase-boundary-contract.json
```

The checker is intentionally small. It is a copyable acceptance test for workflow builders: if a phase handoff cannot pass this gate, the next model should not pretend it has reliable state.
