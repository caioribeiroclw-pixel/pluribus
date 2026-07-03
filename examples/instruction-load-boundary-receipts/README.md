# Instruction load-boundary receipts

A tiny checker for agent instruction files that look safe to a human reviewer but may decode into a different instruction stream for the agent.

This is the boundary behind hidden Unicode tag characters, zero-width text, bidi overrides, homoglyph tricks, inline command expansion, and generated Skills/config files:

```text
human-visible instruction text -> decoded / agent-read instruction stream
```

The point is not to auto-fix rule files silently. The point is to leave a reviewable receipt beside SARIF or scanner output so a maintainer can see exactly what changed between visible text and agent-read text before an agent loads it.

## Try it

A receipt can pass even when it finds a dangerous delta, as long as it records the byte range, hashes, instruction surface, severity, and review gate:

```bash
node check-load-boundary.cjs load-boundary-receipt.json
```

Expected output:

```text
instruction load-boundary receipt ok: 2 files checked, 1 clean, 1 gated for review
```

The unsafe fixture should fail:

```bash
node check-load-boundary.cjs unsafe-load-boundary-receipt.json
```

Why it fails: it marks a changed instruction stream as clean, omits byte-level evidence, and allows silent auto-rewrite of an agent instruction file.

## Minimal fields

For each instruction file or Skill/config surface, keep:

- `path` — file or resource path, e.g. `CLAUDE.md`, `AGENTS.md`, `skills/foo/SKILL.md`, `.cursor/rules/security.mdc`, or MCP config path.
- `git_blob` — immutable source ref/hash for the reviewed bytes.
- `visible_text_hash` — hash of the text humans reviewed.
- `agent_read_text_hash` — hash after decoding/normalization/expansion that the agent actually ingests.
- `surfaces` — where this file becomes instruction context, e.g. `claude_code_project_memory`, `cursor_rules`, `openclaw_skill`, `mcp_config`.
- `status` — `clean` if hashes match and there are no deltas, or `review_required` / `blocked` when they differ.
- `deltas[]` — byte ranges and decoded meaning for hidden/normalized/expanded instructions.
- `remediation.auto_rewrite` — should be `false` unless an explicit reviewer-controlled rewrite artifact is attached.

The useful review prompt is:

```text
Before loading this instruction bundle, show the load-boundary receipt: visible hash, agent-read hash, byte ranges changed by decoding/normalization, active instruction severity, and whether any rewrite is explicitly reviewed. Do not silently auto-fix instructions that agents will later obey.
```

That is the boundary Pluribus cares about: the exact instruction stream that crossed from a reviewed file into an agent run.
