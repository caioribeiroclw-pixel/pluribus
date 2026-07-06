---
name: evidence-attestation
description: Emit privacy-safe evidence attestations for agent actions, reviews, memory answers, handoffs, scores, approvals, and tool dispatches.
---

# Evidence Attestation

Use this Skill when a human, reviewer, downstream agent, registry, leaderboard, approval gate, or audit trail needs proof for a claim without replaying private logs.

The goal is not to summarize the whole session. The goal is to emit a compact attestation that answers:

> What claim is being made, what evidence was observed, what was intentionally omitted, what verdict follows, and what would make this evidence stale?

## When to use

Use this Skill for:

- code review or release claims that cite tests, files, issue trails, PRs, or audit agents;
- memory/RAG answers that might become edit authority;
- handoffs between Claude Code, Codex, Cursor, OpenClaw, humans, or subagents;
- approval gates before deploys, billing changes, customer-facing messages, or destructive tools;
- benchmark/leaderboard score submissions that must not leak transcripts;
- skill/registry claims where a verifier needs cited evidence.

Do not use it when the answer is informal advice and no claim will be reused as authority.

## Privacy defaults

Never include raw prompts, raw transcript text, secrets, tokens, customer data, private source code, full diffs, full tool output, raw memory bodies, raw MCP schemas, or raw browser/network payloads.

Prefer:

- stable ids, short summaries, and hashes;
- source labels such as `observed`, `official`, `community_claim`, `inferred`, or `human_provided`;
- evidence refs that a privileged reviewer can resolve, such as issue URLs, commit ids, command names, fixture paths, or artifact hashes;
- explicit omissions and limits;
- `stale_if` invalidators.

If the available evidence is weak, say so in the verdict. Do not upgrade weak evidence into authority.

## Minimal attestation shape

Emit JSON shaped like this:

```json
{
  "receipt_type": "pluribus.evidence_attestation.v1",
  "skill": "evidence-attestation",
  "subject": {
    "kind": "review|memory_answer|handoff|approval|score|skill_claim|tool_dispatch",
    "id_hash": "sha256:...",
    "summary": "short non-sensitive claim being attested"
  },
  "evidence": [
    {
      "id": "ev-1",
      "kind": "command|file|issue|pr|test|receipt|log_summary|human_review|external_url",
      "ref": "non-sensitive pointer or redacted path",
      "ref_hash": "sha256:...",
      "observed_at": "2026-07-06T21:00:00Z",
      "source_label": "observed|official|community_claim|inferred|human_provided",
      "supports": ["claim-1"],
      "raw_content_copied": false
    }
  ],
  "claims": [
    {
      "id": "claim-1",
      "text": "short claim",
      "status": "supported|contradicted|unknown|not_checked"
    }
  ],
  "verdict": "accepted|rejected|review_required|blocked",
  "privacy": {
    "raw_prompts_copied": false,
    "raw_transcript_copied": false,
    "raw_source_copied": false,
    "secrets_copied": false,
    "customer_data_copied": false
  },
  "omissions": ["what was intentionally left out and why"],
  "limits": ["what this attestation does not prove"],
  "stale_if": ["artifact changes", "evidence ref disappears", "policy/rubric/parser changes"]
}
```

## Procedure

1. Name the claim or boundary in one sentence.
2. Identify the smallest evidence refs needed to support or reject it.
3. Replace private content with hashes, ids, buckets, source labels, or short non-sensitive summaries.
4. Mark each claim `supported`, `contradicted`, `unknown`, or `not_checked`.
5. Choose the verdict:
   - `accepted` only when the evidence supports the claim and no required evidence is missing;
   - `rejected` when evidence contradicts the claim;
   - `review_required` when evidence is partial, stale-prone, or needs a human/verifier;
   - `blocked` when required evidence is inaccessible or unsafe to inspect.
6. Add omissions, limits, and `stale_if` invalidators.
7. Validate with the bundled checker when available.

## 60-second validation

From a Pluribus checkout:

```bash
node examples/evidence-attestation/check-evidence-attestation.mjs \
  examples/evidence-attestation/evidence-attestation.json
```

A passing check means the attestation has the required structure and privacy booleans. It does not prove the underlying work is correct; it proves the evidence boundary is inspectable.
