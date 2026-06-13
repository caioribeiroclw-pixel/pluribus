# Semantic anchor preservation receipt

A tiny checker for Claude Code / Agent Skill workflows that claim big token savings by cleaning pasted context before it enters a session.

Token reduction is useful only if the cleaned paste keeps the anchors that make the task safe to execute: headings, code fences, API signatures, version/migration notes, and must-keep policy/security lines. This example emits a privacy-safe receipt for that claim without logging raw prompts or transcripts.

## Run it

```bash
cd examples/semantic-anchor-receipts
node check-semantic-anchors.mjs \
  --original original-paste.md \
  --cleaned cleaned-paste.md \
  --out /tmp/semantic-anchor.receipt.json
```

The bundled sample should pass and report a token reduction while preserving all detected anchors.

## Receipt shape

```json
{
  "schema": "pluribus.semantic_anchor_preservation_receipt.v1",
  "source_type": "paste-cleaning-skill-or-cli-output",
  "approximate_tokens_before": 224,
  "approximate_tokens_after": 110,
  "approximate_reduction_percent": 50.9,
  "anchors_total": 9,
  "anchors_missing": 0,
  "semantic_loss_check_passed": true,
  "token_savings_claim_allowed": true
}
```

The exact token counts are approximate. The important part is the gate:

- `semantic_loss_check_passed=true` means the cleaned paste preserved the detected anchors.
- `token_savings_claim_allowed=true` means the output both shrank and kept those anchors.
- If any anchor is missing, the checker exits non-zero and the receipt records the missing anchor types/text snippets.

## Why this exists

The market signal has moved beyond MCP tool bloat. Claude Code users are also using Skills and paste-cleaning CLIs that claim 50–70% token savings. Pluribus should not be another optimizer; it should make the optimizer's claim falsifiable:

- What was removed?
- Which must-keep anchors survived?
- Did a `SKILL.md` or CLI helper reduce tokens without deleting version, API, or security context?

Use this receipt before a cleaned paste becomes session context. Pair it with tool/skill adoption receipts later if you need to prove the agent actually used a loaded Skill or MCP tool.
