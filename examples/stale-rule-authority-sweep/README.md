# Stale rule authority sweep

A tiny checker for long-lived `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, or team instruction files that start lying to agents after the repo changes.

The point is not to make permanent context bigger. It is to make every durable rule prove why it still deserves authority before an agent follows it.

## Try it

```bash
node check-stale-rule-authority.cjs current-rules.json --today 2026-07-03
```

Expected output:

```text
stale-rule authority sweep ok: 4 rules checked, 3 current, 1 historical
```

The stale fixture should fail:

```bash
node check-stale-rule-authority.cjs stale-rules.json --today 2026-07-03
```

Why it fails: the receipt marks rules as current even though their only evidence is the instruction file itself, their verification is expired, or they have no removal/demotion rule.

## Minimal fields

For each durable rule, keep:

- `id` — stable rule id, e.g. `api.retry.max_attempts`.
- `statement` — the short instruction agents will see.
- `owner` and `source` — who/what made the rule authoritative.
- `authority` — `current`, `historical`, or `candidate`.
- `evidence` — live proof outside the context file: test, grep, ADR, config path, or code path.
- `last_verified` — date and ref where the evidence was checked.
- `revisit_after` — date/condition when the rule must be rechecked.
- `demotion_rule` — when the agent should treat the rule as suspicious or historical.

The useful pre-work prompt is:

```text
Before editing, run a stale-rule sweep over the rules you plan to obey. For each hard rule, show the live repo evidence, expiry/revisit condition, and demotion rule. If the only evidence is CLAUDE.md/AGENTS.md itself, mark it suspicious instead of authoritative.
```

That is the boundary Pluribus cares about: durable instruction -> current authority before action.
