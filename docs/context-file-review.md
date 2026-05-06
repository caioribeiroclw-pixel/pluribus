# Context File Review Checklist

AI context files are part of the software supply chain.

Files like `CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, Windsurf rules, Continue rules, and Zed rules are not just notes for humans. Agents read them before acting. Some teams also let agents edit them. Treat shared context with the same review discipline you apply to scripts, CI config, and dependency manifests.

Use this checklist before adopting Pluribus, before committing generated context files, or before reviewing a PR that changes AI instructions.

## 1. Separate public project context from private operating context

Good shared context:

- project purpose and architecture;
- stack, package manager, and supported runtime versions;
- build, test, lint, and release commands;
- coding conventions and review expectations;
- security and privacy constraints that are safe to publish.

Do not put these in generated/shared context files:

- API keys, tokens, cookies, passwords, recovery codes, or auth URLs;
- private customer data or internal incident details;
- unreleased strategy that should not leave the team;
- local machine paths that reveal sensitive infrastructure;
- instructions to bypass tests, reviews, permissions, or safety checks.

If a rule needs private detail, store the detail somewhere else and reference the policy at a high level.

## 2. Review instructions as executable influence

A context file can change agent behavior as strongly as code can change runtime behavior. Review diffs for:

- new commands agents are told to run;
- new files or directories agents are told to read or write;
- weakened test, lint, security, or review expectations;
- tool-specific instructions copied into the wrong tool;
- stale paths, package managers, or deployment commands;
- broad instructions like "always", "never", or "ignore" that might have unintended scope.

Prefer concrete, verifiable rules over taste statements. "Run `npm test` before release" is better than "be careful".

## 3. Keep generated files visibly generated

When Pluribus writes tool-specific files, it includes generated-file metadata. Keep that warning intact.

The review rule is simple:

- edit `pluribus.md` or imported source files for shared context;
- regenerate outputs with `pluribus sync`;
- avoid hand-editing generated files unless the file is intentionally tool-native and outside Pluribus.

If someone edits a generated file directly, expect drift.

## 4. Use dry-run before writing

Preview generated outputs before changing a real repo:

```bash
npx pluribus-context validate
npx pluribus-context sync --dry-run
```

Read the preview like a PR diff. Confirm that shared facts appear where they should and that private or tool-specific details did not get flattened into every output.

## 5. Add a drift check to review or CI

For repos that commit generated AI context files, add a lightweight check:

```bash
npx pluribus-context sync
git diff --exit-code -- \
  CLAUDE.md \
  .cursorrules \
  .github/copilot-instructions.md \
  AGENTS.md \
  .windsurf/rules/pluribus.md \
  .continue/rules/pluribus.md \
  .rules
```

This catches two risky cases:

- `pluribus.md` changed but generated files were not updated;
- generated files changed directly and no longer match the source of truth.

## 6. Decide what should stay tool-native

Not every instruction belongs in shared context. Keep tool-native files when a rule depends on one tool's semantics, such as:

- Cursor `.mdc` glob/frontmatter behavior;
- Claude-only slash command notes;
- IDE UI preferences;
- local MCP or extension setup that other tools cannot use;
- experimental prompts that should not affect the whole team.

Pluribus is for stable intentional context that should stay aligned across tools, not for forcing every tool to behave identically.

## Decision rule

Commit and sync shared context when it is safe, stable, reviewable, and useful across two or more tools.

Keep it out of Pluribus when it is secret, local-only, highly experimental, or meaningful to just one tool.
