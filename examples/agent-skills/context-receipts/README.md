# Context receipts Agent Skill recipe

This is a small, copyable Agent Skill recipe for context-engineering users who are adopting Tool Search, lazy MCP loading, skills, memory, compaction, or subagents and need to verify what actually crossed the context boundary.

It is intentionally markdown-only so it can be copied into a local skills directory such as:

- `.claude/skills/context-receipts/SKILL.md`
- `.opencode/skills/context-receipts/SKILL.md`
- `.agents/skills/context-receipts/SKILL.md`

## Quick smoke

Ask an agent or harness using the skill to emit a receipt for one workflow and verify these constraints:

```bash
grep -E 'mcp\.tool_index\.loaded|context\.skill\.registry\.index\.loaded|subagent\.mcp_policy\.applied|subagent\.toolsearch\.propagation\.evaluated|context\.prune\.completed|subagent\.delegation\.requested' receipt.jsonl
grep -E 'raw_(schema|query|args|result|output|transcript|text)_copied":false|raw.*CopiedToReceipt":false' receipt.jsonl
```

Then manually check that the receipt contains counts, hashes, ids, buckets, and `audit_gap`, but does **not** contain private prompts, raw schemas, tool args/results, skill bodies, memory bodies, customer names, secrets, or transcript text.

For executable fixture examples, see [`../../context-input-evidence/`](../../context-input-evidence/), including the ToolSearch propagation and pruning smokes:

```bash
node ../../context-input-evidence/convert-subagent-toolsearch-propagation-log.mjs
node ../../context-input-evidence/convert-pruning-log.mjs
```
