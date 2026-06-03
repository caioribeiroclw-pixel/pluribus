# Loaded-resource boundary receipts

Use this when a Skill, plugin resource, MCP-provided instruction, or custom-agent file appears to be configured correctly but does not actually reach the agent runtime.

This is the failure mode behind reports like:

- "the Skill works in chat but not ACP/Zed/CLI";
- "`/skills` or the skill list is unavailable in this client";
- "the agent followed generic instructions because the real resource was never injected";
- "a prompt workaround says resources are preloaded, but there is no proof they were readable by the runtime".

Pluribus should not become a Skill manager. The useful boundary is a small receipt that proves what crossed from configuration into the run.

## Receipt shape

A loaded-resource receipt separates the stages that are often collapsed into "the skill exists":

| Stage | Question |
| --- | --- |
| `expected` | Which resources did the user/config expect for this agent and task? |
| `discovered` | Did the host find the resource on disk, in a plugin, registry, or MCP response? |
| `attached` | Was the resource attached to the selected agent/profile/workspace? |
| `injected` | Did the runtime put the resource into the model/tool context for this session? |
| `readable` | Could the agent actually read the resource bytes or resolved prompt? |
| `skipped` | If not, what precise stage and reason explain the gap? |

Recommended privacy-safe fields:

```json
{
  "receipt_type": "pluribus.loaded_resource_boundary.v1",
  "scenario": "custom-agent skill parity across chat and ACP",
  "expected_resources": [
    {
      "id": "skill:pr-review",
      "kind": "skill",
      "scope": "project",
      "source_ref": ".kiro/skills/pr-review/SKILL.md",
      "source_hash": "sha256:...",
      "required": true
    }
  ],
  "sessions": [
    {
      "runtime": "chat",
      "client": "kiro-desktop",
      "agent": "reviewer",
      "discovered_resources": ["skill:pr-review"],
      "attached_resources": ["skill:pr-review"],
      "injected_resources": ["skill:pr-review"],
      "readable_resources": ["skill:pr-review"],
      "skipped_resources": []
    },
    {
      "runtime": "acp",
      "client": "zed",
      "agent": "reviewer",
      "discovered_resources": ["skill:pr-review"],
      "attached_resources": ["skill:pr-review"],
      "injected_resources": [],
      "readable_resources": [],
      "skipped_resources": [
        {
          "id": "skill:pr-review",
          "stage": "injected",
          "reason": "runtime_does_not_inject_resources"
        }
      ]
    }
  ]
}
```

Do not include raw skill text, private prompts, credentials, or full project memory. Hashes, refs, stage names, and skip reasons are enough for a maintainer to reproduce the boundary.

## Acceptance test

For the same custom agent and the same attached Skill/resource, compare chat vs ACP/CLI/IDE sessions:

1. The resource should be `discovered` in each runtime that claims to support it.
2. If it is attached in chat but not in ACP/Zed/CLI, record `not_attached_to_agent`.
3. If it is attached but absent from the model context, record `runtime_does_not_inject_resources`.
4. If it was injected but the bytes cannot be resolved, record `resource_read_failed`.
5. If trigger logic prevented loading, record `trigger_not_matched` and include the matched task label or hash, not the full prompt.

A useful bug report is not "Skills are broken". It is:

> For agent `reviewer`, `skill:pr-review` is discovered and attached in both chat and ACP. Chat injects and reads it; ACP/Zed does not inject it and reports `runtime_does_not_inject_resources`.

## Try the example

```bash
node examples/loaded-resource-boundary/check-loaded-resource-boundary.mjs \
  examples/loaded-resource-boundary/loaded-resource-boundary.json
```

The sample intentionally includes a chat-vs-ACP mismatch and treats that mismatch as the useful finding.
