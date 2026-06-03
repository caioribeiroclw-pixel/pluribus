# Phase-boundary contract example

This example is for multi-model coding workflows where one phase plans, another phase applies, and another verifies. It records the exact handoff boundary without storing prompts, transcripts, raw source, secrets, or full command output.

Run:

```bash
node check-phase-boundary.mjs phase-boundary-contract.json
```

Expected output:

```text
phase-boundary contract ok: checkout-refactor-2026-06-03 apply->verify
```

Use the shape as a small gate before moving from Apply to Verify:

- approved plan/task refs and hashes entered the phase;
- output artifact hash exists;
- changed file-set hash and tests are present;
- open risks are explicit;
- stale exploration transcript or rejected designs are intentionally dropped.
