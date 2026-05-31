# AI PR review receipts

AI-generated PRs are not risky because they are large or small. They are risky when the reviewer cannot tell which operational boundaries the agent touched.

Use this recipe when Claude Code, Cursor, Codex, Copilot agents, OpenClaw, or another coding agent opens a PR and the team needs a compact review artifact before merge.

The goal is not to log prompts, transcripts, source code, stack traces, secrets, customer data, or raw tool output. The goal is a privacy-safe receipt that proves the review unit: blast radius.

## When this helps

Use an AI PR review receipt when a change may affect:

- database schema, migrations, backfills, or persisted data contracts;
- readers/writers that run while a migration or rollout is in progress;
- async jobs, queues, cron tasks, webhooks, retries, or background workers;
- feature flags, rollout gates, kill switches, or compatibility shims;
- external side effects such as payments, email, auth, billing, search indexes, analytics, or third-party APIs;
- generated files, public APIs, plugin manifests, MCP/Skill/hook configuration, or security-sensitive project config.

If none of these apply, the receipt can say so. That negative claim is still useful because it tells the human reviewer what the agent believes it did **not** touch.

## Receipt shape

Attach this as a PR body section, `REVIEW.md` note, check-run summary, or bot comment.

```json
{
  "type": "review.blast_radius.v1",
  "pr": {
    "source": "agent-pr",
    "review_requested": true,
    "human_review_required": true
  },
  "boundaries": [
    {
      "name": "schema_or_data_contract",
      "status": "touched",
      "evidence": "migration file added; live reader compatibility checked",
      "risk_tier": "high",
      "review_owner": "backend"
    },
    {
      "name": "async_or_background_path",
      "status": "not_touched",
      "evidence": "no queue/cron/webhook paths changed in diff summary",
      "risk_tier": "low"
    },
    {
      "name": "rollout_gate",
      "status": "present",
      "evidence": "feature flag path exists before new behavior is enabled",
      "risk_tier": "medium"
    },
    {
      "name": "external_side_effect",
      "status": "ambiguous",
      "evidence": "email sender import changed; no dry-run evidence found",
      "risk_tier": "high",
      "blocked_until": "reviewer confirms side-effect behavior"
    }
  ],
  "tests_and_checks": [
    {
      "name": "unit_or_integration_tests",
      "status": "passed",
      "scope": "changed package only"
    },
    {
      "name": "migration_or_rollback_check",
      "status": "missing",
      "blocks_merge": true
    }
  ],
  "decision": {
    "merge_ready": false,
    "reason": "external side effect and rollback evidence are ambiguous",
    "next_safe_action": "ask backend owner to review email behavior and migration rollback before merge"
  },
  "privacy": {
    "raw_prompt_logged": false,
    "raw_source_logged": false,
    "raw_tool_output_logged": false,
    "secrets_logged": false,
    "customer_data_logged": false
  }
}
```

## Minimal PR template

Copy this into `.github/pull_request_template.md` or a review-bot comment.

```markdown
## AI PR review receipt

This PR was prepared or modified by an AI coding agent. Review by blast radius, not by diff size alone.

### Boundary receipt

| Boundary | Status | Evidence | Risk tier | Owner / blocker |
| --- | --- | --- | --- | --- |
| Schema / persisted data contract | `touched / not_touched / ambiguous` |  |  |  |
| Live reader/writer compatibility | `checked / missing / n/a` |  |  |  |
| Async jobs / queues / cron / webhooks | `touched / not_touched / ambiguous` |  |  |  |
| Rollout gate / feature flag / kill switch | `present / missing / n/a` |  |  |  |
| External side effects | `declared / not_touched / ambiguous` |  |  |  |
| Generated files / public API / plugin config | `touched / not_touched / ambiguous` |  |  |  |

### Checks

- [ ] Tests relevant to touched boundaries passed.
- [ ] Migration/backfill/rollback behavior is explicit, or not applicable.
- [ ] External side effects are declared, or not touched.
- [ ] Any `ambiguous` boundary has an owner before merge.

### Privacy

This receipt does not include raw prompts, transcripts, source code, secrets, customer data, stack traces, or raw tool output.

### Decision

`merge_ready: yes/no`

`next_safe_action:`
```

## CI gate example

The copyable example in [`examples/ai-pr-review-receipts/`](../examples/ai-pr-review-receipts/) includes:

- a PR template for human-readable blast-radius review;
- a GitHub Actions workflow that validates a machine-readable `agent.review_primitive_receipt.v1` receipt;
- a passing fixture and an intentionally failing fixture.

Run the smoke locally from the repository root:

```bash
node examples/review-primitive-gate/check-review-receipt.mjs \
  examples/ai-pr-review-receipts/review-primitive-receipt.json

node examples/review-primitive-gate/check-review-receipt.mjs \
  examples/ai-pr-review-receipts/incomplete-review-primitive-receipt.json
```

The first command should pass. The second should fail because partial/unsafe or under-evidenced agent work should not silently pass a merge gate.

## How to use with Pluribus

Pluribus does not need to own your PR workflow. Use it as the neutral language for evidence that crossed an agent boundary:

- `review_boundary_schema_data`
- `live_reader_writer_compatibility`
- `review_boundary_async_path`
- `rollout_gate_present`
- `external_side_effects_declared`
- `not_touched_boundary_claim`
- `ambiguous_boundary_blocks_merge`
- `risk_tier_evidence`
- `next_safe_action`

The same terms can appear in a GitHub PR template, a Claude Code `/code-review` note, an OpenClaw task receipt, a CI check summary, or a release checklist.

## Bad receipts

Avoid receipts that say only:

- “tests passed”;
- “Claude reviewed it”;
- “small PR”;
- “no issues found”;
- “looks safe.”

Those are conclusions. A useful receipt names the boundary, the evidence, the risk tier, and the next safe action when something is ambiguous.
