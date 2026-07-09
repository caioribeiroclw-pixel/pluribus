# Context hygiene receipts

Use a context hygiene receipt before a Claude Code, Cursor, MCP, Skill, or memory cleanup tool deletes, disables, compacts, or stops loading context.

The question is not just “can we reduce tokens?” It is:

> Which context sources were loaded, which ones look stale/duplicated/unused, which ones are intentionally kept for safety, and how do we roll back if pruning breaks the run?

This is the audit-before-prune shape for `/hygiene`, `/doctor`, memory-kit cleanup, MCP tool deferral, and AI-rules config doctors.

## What the receipt proves

- effective context budget and source-by-source token attribution;
- loaded, deferred, stale, duplicated, suppressed, and safety-kept sources;
- candidate removals with evidence, estimated token savings, and removal risk;
- negative controls: context that looks expensive but must stay loaded for safety or policy;
- human review gate before cleanup starts;
- before/after token counts and rollback command after cleanup;
- `stale_if` invalidators that force a new audit.

## What it must not contain

The receipt is evidence, not a transcript dump. Keep these omitted or hashed:

- raw prompts and chat transcripts;
- source code and private file contents;
- raw rule, memory, or skill bodies;
- MCP schemas/tool results;
- secrets, tokens, env values, customer data, or protected research data.

## Try it locally

```bash
node examples/context-hygiene-receipts/check-context-hygiene-receipt.mjs \
  examples/context-hygiene-receipts/context-hygiene-receipt.json
```

Expected result:

```text
context hygiene receipt ok: 7 sources, 3 candidates, 2 negative controls, verdict review_before_cleanup
privacy ok: no raw prompts/transcripts/source/rule bodies/secrets/customer data copied
```

## Minimal shape

```json
{
  "schema": "pluribus.context_hygiene_receipt.v1",
  "mode": "audit_before_prune",
  "loaded_sources": [
    {
      "id": "src:repo-claude-md",
      "kind": "instruction_file",
      "surface": "CLAUDE.md",
      "source_hash": "sha256:...",
      "token_estimate": 1800,
      "load_status": "loaded",
      "last_used_evidence": "cited_in_plan",
      "action": "keep"
    }
  ],
  "candidate_removals": [
    {
      "source_id": "src:stale-memory-note",
      "reason": "superseded_by_current_runbook",
      "evidence": ["newer_hash_matches", "no_citations_last_30d"],
      "estimated_token_savings": 2400,
      "risk": "low",
      "safe_to_remove": true
    }
  ],
  "negative_controls": [
    {
      "source_id": "src:security-policy",
      "why_keep": "safety_policy_even_if_rarely_cited"
    }
  ],
  "human_review_required": true,
  "cleanup_started": false,
  "rollback": {
    "available": true,
    "command_hash": "sha256:..."
  },
  "privacy": {
    "raw_prompts_included": false,
    "raw_transcripts_included": false,
    "source_code_included": false,
    "raw_rule_bodies_included": false,
    "secrets_included": false,
    "customer_data_included": false
  },
  "verdict": "review_before_cleanup"
}
```

## Relationship to other receipts

- [Context budget receipts](context-budget-receipts.md) answer “where did the budget go?”
- Context hygiene receipts answer “what can be safely pruned, and what must stay?”
- [Config treatment receipts](config-treatment-receipts.md) answer “did a config doctor’s generated authority actually load?”
- [Compaction resume receipts](compaction-resume-receipts.md) answer “can the next agent safely resume after summarization?”

If a native tool ships `/hygiene`, `/doctor`, or MCP lazy-loading, it can emit this receipt as the reviewable plan before making changes.
