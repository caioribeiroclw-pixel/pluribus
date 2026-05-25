# Context-budget receipts

Privacy-safe receipts for answering a narrow operational question:

> What ate the agent's context before or after the task?

This is different from generic token accounting. A context-budget receipt should prove which context surfaces were available, which ones crossed the boundary, which ones stayed deferred or suppressed, and how much budget remained — without exporting raw prompts, tool schemas, tool outputs, memory bodies, file paths, ticket text, secrets, or customer data.

If you want a copyable Agent Skill recipe instead of a spec-style guide, see [`examples/agent-skills/context-receipts/`](../examples/agent-skills/context-receipts/). It turns the receipt pattern into a 60-second smoke checklist for Tool Search, skills, and subagent boundaries.

## When to use this receipt

Use a context-budget receipt when a coding agent looks lazy, fails with `prompt is too long`, or returns a tiny summary after a subagent/tool-heavy step and you need to distinguish:

- the user prompt was too large;
- MCP/tool schemas were eagerly materialized;
- a skill or rule listing consumed startup budget;
- memory/search results hydrated too much context;
- a manager subagent isolated heavy tools correctly;
- a child subagent pasted raw tool output back into the parent; or
- a CLI/MCP gateway used progressive disclosure correctly.

## Minimum contract

A useful receipt starts small:

```json
{
  "event.name": "context.budget.evaluated",
  "component": "subagent_boot | mcp_gateway | cli | mcp_manager | delegation",
  "candidate_count": 566,
  "loaded_count": 2,
  "suppressed_count": 564,
  "delivered_hash_count": 2,
  "startup_token_bucket": "100k-200k",
  "remaining_token_bucket": "0-10k",
  "privacy.raw_prompt_included": false,
  "privacy.raw_schema_included": false,
  "privacy.raw_tool_output_included": false,
  "audit_gap": "proves context boundary, not semantic quality"
}
```

Keep exact counts when they are not sensitive. Bucket token counts and sizes when exact values could reveal private workload shape.

## Subagent boot budget

Subagents can fail before task #1 if they inherit every MCP schema, skill listing, rule, or memory index from the parent. The receipt should separate:

- `available` — what could have been loaded;
- `loaded` — what actually entered the subagent prompt/context;
- `suppressed` or `deferred` — what stayed out;
- `remaining` — coarse budget after bootstrap; and
- `failure_or_headroom` — whether the subagent had room for tool results.

Runnable fixture:

```bash
node examples/context-input-evidence/convert-subagent-context-budget-log.mjs
```

Public trace:

- `examples/context-input-evidence/subagent-context-budget-otel-trace.json`

## Per-agent MCP injection

Role-specific subagents may need different MCP surfaces: a testing agent might need `testing` and `github`, while deployment, analytics, email, or browser servers should stay outside that boot context. The receipt should prove the policy boundary before the first task:

- role/session id for the subagent without raw instructions;
- available server count/hash for the role;
- excluded server count/hash before boot;
- loaded vs deferred tool-definition counts;
- startup token bucket after the policy was applied; and
- an explicit audit gap that this proves injection scope, not semantic tool quality.

Minimal events:

- `subagent.mcp_policy.applied`
- `subagent.context_boot.evaluated`

## Delegation boundary

A subagent can save parent context at boot and still lose the benefit if raw child output is pasted back into the parent. The receipt should prove:

- delegation happened;
- child output size stayed in the child/subagent store;
- parent received a bounded summary, not raw output;
- raw child output was not copied into the receipt; and
- the audit gap remains explicit: the receipt proves the boundary, not summary correctness.

Runnable fixture:

```bash
node examples/context-input-evidence/convert-subagent-delegation-log.mjs
```

Public trace:

- `examples/context-input-evidence/subagent-delegation-otel-trace.json`

## MCP manager isolation

When a manager subagent owns hundreds of MCP tools, the parent should see a small request/summary surface, not the whole tool catalog. The receipt should prove:

- parent full schemas were not loaded;
- the manager booted with the tool catalog;
- one or a small set of tools was selected;
- unselected schemas stayed suppressed; and
- only a bounded parent summary returned.

Runnable fixture:

```bash
node examples/context-input-evidence/convert-claudekit-mcp-manager-log.mjs
```

Public trace:

- `examples/context-input-evidence/claudekit-mcp-manager-otel-trace.json`

## Progressive disclosure: MCP gateway or CLI

If a gateway or CLI avoids context bloat by showing an index/prompt first and expanding one schema/help page later, the receipt should prove the disclosure boundary:

- small agent prompt or meta-tool/index loaded at startup;
- full schemas/specs were not loaded at startup;
- one command/schema was hydrated on demand;
- raw args/results stayed out of the receipt; and
- selected/suppressed counts are visible enough for debugging.

Runnable fixtures:

```bash
node examples/context-input-evidence/convert-agentgateway-progressive-disclosure-log.mjs
node examples/context-input-evidence/convert-cli-progressive-disclosure-log.mjs
node examples/context-input-evidence/convert-mcp-tool-search-log.mjs
```

Public traces:

- `examples/context-input-evidence/agentgateway-progressive-disclosure-otel-trace.json`
- `examples/context-input-evidence/cli-progressive-disclosure-otel-trace.json`
- `examples/context-input-evidence/mcp-tool-search-otel-trace.json`

## Privacy defaults

For shareable receipts:

- hash or HMAC stable identifiers; prefer HMAC for predictable IDs, paths, user IDs, and audit IDs;
- fail closed or omit identifier hashes when the HMAC key is missing;
- bucket large sizes and token counts;
- never export raw schemas, raw memory, raw prompt, raw tool output, paths, tickets, emails, secrets, or customer-specific strings;
- include explicit `raw_*_included=false` flags; and
- include `audit_gap` so readers do not confuse boundary evidence with semantic correctness.

## What to ask in a bug report

Instead of “why is my subagent bad?”, ask for a receipt or debug JSON that can answer:

1. How many tools/skills/rules/memory entries were available?
2. How many were loaded into the parent?
3. How many were loaded into the subagent?
4. How many were suppressed/deferred?
5. For a subagent, which MCP servers were allowed and which were excluded before boot?
6. What token bucket remained before the first tool call?
7. Did raw child output return to the parent, or only a bounded summary?

That is the narrow wedge for Pluribus: context-budget evidence across agent boundaries, not another memory store or tool router.
