# Dynamic workflow run receipts

Claude Code-style dynamic workflows move orchestration into a script that can spawn many subagents, keep intermediate results outside the parent conversation, and show progress by phase, agent count, token total, and elapsed time.

That is useful when a codebase audit, migration, research task, or verification pass needs more parallelism than one conversation can coordinate. It also creates a new review problem: after a workflow fans out, you need to know whether the expensive path bought better verification or just more context drift.

Use a dynamic workflow run receipt when a workflow, ultracode run, local LLM gateway, or multi-agent script delegates work across several agents/models and a human needs a privacy-safe summary of what actually happened.

This is not an orchestration framework. The receipt is the stable artifact: compact evidence for each phase and spawned agent without logging raw prompts, source code, transcripts, tool output, secrets, customer data, or proprietary file paths.

## When this helps

Use this receipt when:

- a workflow spawns several agents to audit, migrate, research, or verify a codebase;
- agents may run different roles, models, or local/remote providers;
- the run has a token/cost budget that needs to be explained after the fact;
- the parent session sees only the final report, not every intermediate result;
- a reviewer needs to know what context was loaded, skipped, or suppressed for each agent;
- the run stops, pauses, resumes, or rejects a result and the stop point matters.

## Receipt shape

Attach this to a workflow report, PR body, task handoff, run summary, or CI artifact.

```json
{
  "type": "dynamic.workflow.run_receipt.v1",
  "workflow": {
    "workflow_id": "wf_checkout_auth_audit_2026_05_30",
    "runner": "claude-code-dynamic-workflow",
    "script_source": "generated-then-reviewed-command",
    "script_hash": "sha256:example-only",
    "task_kind": "codebase_auth_audit",
    "plan_approved_before_run": true,
    "resumable": true,
    "started_at": "2026-05-30T15:20:00Z",
    "completed_at": "2026-05-30T15:31:42Z"
  },
  "permissions": {
    "tool_allowlist_inherited": true,
    "writes_allowed": false,
    "network_allowed": false,
    "external_commands_allowed": ["grep", "test --dry-run"],
    "permission_profile": "review-only"
  },
  "phases": [
    {
      "phase_id": "route-inventory",
      "purpose": "find candidate auth-sensitive routes",
      "agent_count": 3,
      "token_spend_bucket": "under_50k",
      "elapsed_ms_bucket": "under_2m",
      "result": "completed"
    },
    {
      "phase_id": "adversarial-review",
      "purpose": "cross-check candidate misses",
      "agent_count": 2,
      "token_spend_bucket": "under_25k",
      "elapsed_ms_bucket": "under_2m",
      "result": "completed_with_gaps"
    }
  ],
  "agents": [
    {
      "agent_id": "agent-route-auditor-1",
      "phase_id": "route-inventory",
      "role": "route-auth-auditor",
      "model": "claude-sonnet",
      "provider": "anthropic",
      "context_loaded": ["repo-policy", "auth-boundary-rules", "route-index-summary"],
      "context_skipped_or_suppressed": [
        {
          "source": "customer-fixture-dump",
          "reason": "contains raw customer data; summary hash only"
        }
      ],
      "tools_granted": ["read", "grep"],
      "tools_used": ["grep"],
      "feature_areas_checked": ["checkout routes", "admin routes"],
      "token_budget_bucket": "under_25k",
      "token_spend_bucket": "under_10k",
      "stop_reason": "completed_assigned_partition",
      "confidence": "medium",
      "known_gaps": ["did not execute integration tests"],
      "raw_prompt_logged": false,
      "raw_tool_output_logged": false,
      "raw_paths_logged": false
    },
    {
      "agent_id": "agent-reviewer-1",
      "phase_id": "adversarial-review",
      "role": "adversarial-auth-reviewer",
      "model": "local-codex-compatible",
      "provider": "local-llm-gateway",
      "context_loaded": ["candidate-findings-summary", "public-api-contract-summary"],
      "context_skipped_or_suppressed": [],
      "tools_granted": ["read"],
      "tools_used": ["read"],
      "feature_areas_checked": ["route findings cross-check"],
      "token_budget_bucket": "under_10k",
      "token_spend_bucket": "under_10k",
      "stop_reason": "flagged_unverified_claim",
      "confidence": "low",
      "known_gaps": ["one route requires owner confirmation before merge"],
      "raw_prompt_logged": false,
      "raw_tool_output_logged": false,
      "raw_paths_logged": false
    }
  ],
  "handoff": {
    "final_result_kind": "workflow_review_receipt",
    "claims_rejected_or_deferred": 1,
    "next_safe_action": "ask route owner to confirm checkout callback auth before writing fix",
    "where_it_stopped": "ambiguous auth boundary before mutation"
  },
  "privacy": {
    "raw_prompts_logged": false,
    "raw_source_logged": false,
    "raw_tool_output_logged": false,
    "transcripts_logged": false,
    "secrets_logged": false,
    "customer_data_logged": false
  }
}
```

## Minimal checklist

Before trusting the result of a dynamic workflow, ask for:

- workflow/run id, runner, script source, script hash, and whether the plan was approved before execution;
- permission profile, inherited tool allowlist, write/network/command capability, and whether the run was review-only or mutating;
- phases, agent counts, token spend buckets, elapsed-time buckets, and phase result states;
- per-agent role, model/provider actually used, context loaded, context skipped/suppressed, tools granted/used, token budget/spend, stop reason, confidence, and known gaps;
- explicit privacy flags proving raw prompts, source, transcripts, tool output, paths, secrets, and customer data were not logged;
- a handoff that says what was accepted, rejected/deferred, where the workflow stopped, and the next safe action.

## What not to log

Do not include raw prompts, full workflow scripts when they reveal private structure, full transcripts, source code, exact proprietary paths, tool output, secrets, credentials, customer data, stack traces, or raw LLM gateway logs. Prefer coarse names, hashes, buckets, counts, role labels, decision states, stop reasons, and owner labels.
