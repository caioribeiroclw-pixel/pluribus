# Portability Fidelity Report

Use this when a rule pack, skill bundle, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, or Copilot instruction file claims to be portable across AI coding tools.

The goal is not to prove that every tool behaves identically. The goal is to make portability claims falsifiable: which tools were tested, which capabilities are required, where semantics are lossy, and what evidence a reviewer can inspect.

This pattern came from live market signals around AI skills and rule bundles: authors want to mark instructions as "universal", but tool capabilities, file loading rules, write APIs, glob semantics, and security defaults differ enough that a boolean label can hide silent semantic loss.

## 60-second disposable check

Try the example without touching a real repo:

```bash
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus/examples/portability-fidelity
node ../../bin/pluribus.js validate
node ../../bin/pluribus.js sync --dry-run
node ../../bin/pluribus.js audit --json
```

For the npm release path, copy `examples/portability-fidelity/pluribus.md` into a temporary directory as `pluribus.md`, then run:

```bash
npx --yes pluribus-context@latest validate
npx --yes pluribus-context@latest sync --dry-run
npx --yes pluribus-context@latest audit --json
```

## What a claim should say

Avoid this:

```yaml
portable: true
```

Prefer claims that include evidence and known loss:

```yaml
portability:
  tier: portable-with-adapters
  testedOn:
    - target: claude-code
      evidence: generated CLAUDE.md smoke-reviewed on 2026-05-18
    - target: cursor
      evidence: generated .cursorrules smoke-reviewed on 2026-05-18
    - target: github-copilot
      evidence: generated .github/copilot-instructions.md smoke-reviewed on 2026-05-18
  requiredCapabilities:
    - read repository instructions before planning
    - preserve generated-file warning
    - respect security constraints before edits
  knownLossyTargets:
    - target: flat-markdown-targets
      loss: cannot represent Cursor-style path/glob activation; keep scoped rules tool-native or annotate the loss
```

In Pluribus, keep that claim inside the source file so every generated output carries the same reviewable contract.

## Decision rule

A rule/skill/context bundle is portable only when a maintainer can answer four questions from the repo:

1. **Capability:** what does the instruction require from the target tool?
2. **Evidence:** where was that target actually rendered or smoke-tested?
3. **Loss:** which semantics are degraded, flattened, or unsupported?
4. **Fallback:** what should a user do when a target lacks the capability?

If any answer is missing, use a narrower label such as `project-local`, `target-native`, or `portable-with-loss` instead of `universal`.

## How Pluribus helps

Pluribus is intentionally narrower than a skill registry or memory layer:

- `pluribus.md` keeps the claim in one reviewed source of truth.
- `sync --dry-run` previews target-specific outputs before writing files.
- generated files carry a warning header so manual edits are visible.
- `audit --json` gives CI/reviewers a machine-readable check for missing or drifted outputs.
- remote imports are opt-in, locked, cached, and digest-checked before becoming shared context.

That does **not** prove runtime behavior. You still need tool-specific smoke tests for load order, path/glob activation, available tools, MCP servers, and permission semantics.

## Suggested workflow for maintainers

1. Put the portability claim in the canonical source.
2. Generate target outputs with `sync --dry-run` and inspect semantic loss.
3. Keep target-native instructions when a semantic cannot be represented everywhere.
4. Commit a small audit artifact (`pluribus audit --json --output reports/pluribus-audit.json`) when you want CI/review evidence.
5. Update the claim whenever a new target is added, a tool changes capability names, or a permission/security default changes.

## Feedback wanted

If your rule pack, skill bundle, or instruction manifest needs a different evidence shape, open a focused issue: https://github.com/caioribeiroclw-pixel/pluribus/issues/new

Do not paste private instructions, secrets, tokens, customer data, or proprietary source in public feedback.
