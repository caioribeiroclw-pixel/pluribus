# Subagent role receipts

Custom subagents are useful only if the caller can tell which role instructions actually governed the delegated work.

Use this recipe when a project defines Codex/Claude Code/Cursor/OpenClaw-style subagents and wants a privacy-safe receipt for the role boundary: which role was requested, which instruction source was loaded, which tools/capabilities were allowed or deferred, and where the subagent stopped before crossing an unsafe boundary.

This is not a claim that every agent runner uses the same file format. Treat `agents.toml` as a portable **example** for role definitions, and treat the receipt as the stable artifact: evidence about the role boundary without logging raw prompts, source code, transcripts, tool output, secrets, or customer data.

## When this helps

Use a subagent role receipt when:

- a manager agent delegates work to a specialist reviewer, tester, security checker, migration planner, or docs writer;
- the role has a narrower policy than the main agent;
- the subagent has restricted tools, MCP servers, or write permissions;
- the role should refuse mutation and only report findings;
- a human reviewer needs to know which role instructions were loaded before trusting the result.

## Example role definition

The example in [`examples/subagent-role-receipts/agents.toml`](../examples/subagent-role-receipts/agents.toml) defines two project-local roles:

- `blast-radius-reviewer` — reviews AI-generated PRs by operational boundaries before merge;
- `temporal-authority-checker` — checks whether docs/specs are current or superseded before an agent writes code.

The file is intentionally small so it can be adapted to the runner you use.

## Receipt shape

Attach this to a PR body, task handoff, review-bot comment, or run summary.

```json
{
  "type": "subagent.role_boundary.v1",
  "delegation": {
    "requested_role": "blast-radius-reviewer",
    "effective_role": "blast-radius-reviewer",
    "role_source": "agents.toml",
    "role_source_hash": "sha256:example-only",
    "caller": "manager-agent"
  },
  "instructions": {
    "loaded": true,
    "source_kind": "project-local-role-definition",
    "raw_instruction_logged": false,
    "policy_summary": [
      "review by blast radius, not diff size",
      "do not approve merge when boundary evidence is ambiguous"
    ]
  },
  "capabilities": {
    "writes_allowed": false,
    "tools_allowed": ["read", "grep", "test-summary"],
    "tools_deferred_or_unavailable": ["shell-write", "deploy", "migration-apply"],
    "mcp_servers_allowed": []
  },
  "boundary_decisions": [
    {
      "boundary": "schema_or_data_contract",
      "status": "ambiguous",
      "decision": "blocks_merge",
      "reason": "migration rollback evidence missing"
    }
  ],
  "handoff": {
    "result_kind": "review_receipt",
    "stopped_at": "ambiguous boundary before merge approval",
    "next_safe_action": "ask backend owner to confirm rollback and reader compatibility"
  },
  "privacy": {
    "raw_prompt_logged": false,
    "raw_source_logged": false,
    "raw_tool_output_logged": false,
    "transcript_logged": false,
    "secrets_logged": false,
    "customer_data_logged": false
  }
}
```

## Minimal checklist

Before trusting a delegated subagent result, ask for:

- requested role and effective role match;
- role definition source and coarse hash/version;
- whether role instructions loaded through the intended path;
- allowed/refused tool and write capabilities;
- boundary decisions made by the role;
- where the role stopped and the next safe action;
- explicit privacy flags showing raw prompts/source/tool output were not logged.

## What not to log

Do not include raw prompts, full instructions, transcripts, source code, file paths that expose private structure, tool output, secrets, credentials, customer data, stack traces, or proprietary diffs. Prefer coarse names, hashes, counts, decision states, and review-owner labels.
