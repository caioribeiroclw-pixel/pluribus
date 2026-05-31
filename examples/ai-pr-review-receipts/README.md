# AI PR review receipts example

This example contains a copyable GitHub PR template and CI gate for agent-generated or agent-modified pull requests.

Use it when review risk depends on blast radius: schema/data contracts, async paths, rollout gates, external side effects, generated/public interfaces, or security-sensitive config.

The point is not to make every AI PR small. It is to make the risky boundaries reviewable enough that CI or a maintainer can decide: merge, route to a human owner, or stop.

## Files

- [`.github/pull_request_template.md`](.github/pull_request_template.md) — human-readable PR body section for blast-radius review.
- [`.github/workflows/ai-pr-review-receipt.yml`](.github/workflows/ai-pr-review-receipt.yml) — copyable GitHub Actions gate that validates a machine-readable receipt.
- [`review-primitive-receipt.json`](review-primitive-receipt.json) — passing receipt fixture.
- [`incomplete-review-primitive-receipt.json`](incomplete-review-primitive-receipt.json) — failing fixture for partial/unsafe evidence.

## 60-second local smoke

From the repository root:

```bash
node examples/review-primitive-gate/check-review-receipt.mjs \
  examples/ai-pr-review-receipts/review-primitive-receipt.json
```

Expected: `ok: true`.

Then run the incomplete fixture:

```bash
node examples/review-primitive-gate/check-review-receipt.mjs \
  examples/ai-pr-review-receipts/incomplete-review-primitive-receipt.json
```

Expected: non-zero exit. The failure is intentional: unapproved scope change, skipped required test, missing evidence, and `partial` resume state should not silently pass a merge gate.

## GitHub Actions usage

1. Copy `.github/workflows/ai-pr-review-receipt.yml` into your repo.
2. Have your Claude Code / Codex / Cursor / OpenClaw / review bot emit a privacy-safe receipt at `artifacts/review-primitive-receipt.json`.
3. Keep raw prompts, transcripts, source code, secrets, stack traces, customer data, and raw tool output out of the receipt.
4. Let the workflow fail if the receipt is partial, unsafe, missing evidence, or outside approved boundaries.

The template and JSON receipt can be used together: the PR body explains the blast radius to humans, while the JSON receipt gives CI a hard decision primitive.

## Why this exists

Large AI PRs are not automatically unsafe, and small PRs are not automatically reviewable. Diff size is a proxy. This receipt makes the underlying question explicit:

- Which assignment did the agent accept?
- What read/write boundaries were approved?
- Did scope or access change mid-run, and was it approved?
- Which required checks actually ran, with evidence?
- Did the agent refuse unsafe operations?
- Is the handoff `complete`, `partial`, or `unsafe-to-resume`?
- What is the next safe action for the reviewer?
