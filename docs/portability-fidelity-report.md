# Portability Fidelity Report

Use this when a rule pack, skill bundle, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, Bob `.bob/rules/*.md`, or Copilot instruction file claims to be portable across AI coding tools.

The goal is not to prove that every tool behaves identically. The goal is to make portability claims falsifiable: which tools were tested, which capabilities are required, where semantics are lossy, and what evidence a reviewer can inspect.

This pattern came from live market signals around AI skills and rule bundles: authors want to mark instructions as "universal", but tool capabilities, file loading rules, write APIs, glob semantics, and security defaults differ enough that a boolean label can hide silent semantic loss.

## 60-second disposable check

Try the example without touching a real repo:

```bash
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus/examples/portability-fidelity
node ../../bin/pluribus.js validate
node ../../bin/pluribus.js sync --dry-run
node ../../bin/pluribus.js audit --json --fidelity-report
```

For the npm release path, copy `examples/portability-fidelity/pluribus.md` into a temporary directory as `pluribus.md`, then run:

```bash
npx --yes pluribus-context@latest validate
npx --yes pluribus-context@latest sync --dry-run
npx --yes pluribus-context@latest audit --json --fidelity-report
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
    - target: bob
      evidence: generated .bob/rules/pluribus.md smoke-reviewed on 2026-05-18
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
- `audit --json --fidelity-report` gives CI/reviewers a machine-readable check for missing/drifted outputs plus target-by-target section loss, activation shape, native discovery surface, resolution anchor, generic fallback status, load evidence, duplicate-load selection evidence, effective context scope, and portability warnings.
- remote imports are opt-in, locked, cached, and digest-checked before becoming shared context.

That does **not** prove runtime behavior. You still need tool-specific smoke tests for load order, path/glob activation, available tools, MCP servers, and permission semantics.

### Fields to inspect in `fidelityReport.targets[]`

For each selected target, the JSON report includes:

- `nativeDiscoverySurface` — the file or directory pattern the target normally discovers, such as `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `AGENTS.md`, or Bob `.bob/rules/*.md`.
- `resolutionAnchor` — where the generated surface is resolved from today (`repo-root` for built-in targets).
- `genericFallback` — whether the output is a broad agent fallback surface rather than a target-specific native surface.
- `manualActivationRequired` — whether Pluribus knows the output requires manual activation after generation. Built-in project-wide targets are currently `false`; future scoped/skill targets may differ.
- `loadEvidence` — how the generated context is expected to enter the agent session. Built-in targets currently report `loadedBy` (`native-file-discovery` or `generic-agent-file`), `effectiveSource`, `deliveryMechanism`, `hookInstalled: false`, `injectedOnSessionStart: false`, `resumeBehavior: not-proven`, and `dedupeRisk: unknown`; this makes native-vs-hook-vs-manual duplication an explicit evidence question instead of an assumption.
- `duplicateLoadEvidence` — which generated candidate Pluribus can identify for duplicate-load review. Built-in targets currently report a `contentIdentity` hash, one `candidateLoads[]` item, a matching `selectedLoad`, empty `suppressedLoads`, `crossRootScanMode: not-inspected`, and `duplicateRisk: unknown`; this is a receipt shape for Cursor/Claude-style duplicate skill or duplicate `CLAUDE.md` loads, not proof of runtime suppression.
- `effectiveContext` — what Pluribus can prove about the context a target receives. Built-in targets currently report `scope: repo-root`, `pathScoped: false`, `inheritance: none-modeled`, `overrideBehavior: none-modeled`, plus the inferred `loadedBy` and `effectiveSource`; this is explicit evidence that monorepo path inheritance/isolation still needs a separate smoke.
- `semanticDifference` — a compact list such as `section-loss`, `project-wide-only`, `no-path-scope-evidence`, `generic-agent-file`, or `runtime-load-dedupe-not-proven` so reviewers can distinguish “file exists” from “same behavior is preserved.”

These fields are intentionally boring. They help reviewers catch cases like “installed files exist but the agent will not discover them,” “a hook injects the same context already loaded natively,” “two targets share a generic file but do not actually have the same loading semantics,” or “root and subfolder instruction files exist but nobody has proven the effective context for `apps/client/`.”

## Suggested workflow for maintainers

1. Put the portability claim in the canonical source.
2. Generate target outputs with `sync --dry-run` and inspect semantic loss.
3. Keep target-native instructions when a semantic cannot be represented everywhere.
4. Commit a small audit artifact (`pluribus audit --json --fidelity-report --output reports/pluribus-audit.json`) when you want CI/review evidence.
5. For hook/native/manual mixes, treat `loadEvidence.dedupeRisk: unknown` as a warning, not proof. Add a target-specific receipt for `loadedBy`, `hookInstalled`, `injectedOnSessionStart`, and resume behavior before claiming deduplication.
6. For multi-root skill/rule scans, treat `duplicateLoadEvidence.duplicateRisk: unknown` as a warning, not proof. Add a target-specific receipt for `candidateLoads`, `selectedLoad`, `suppressedLoads`, discovery roots, and content hashes before claiming duplicate suppression.
7. For monorepos, treat `effectiveContext.scope: repo-root` as a warning, not proof. Add a target-specific smoke for the path you care about, for example `apps/client/` should load root + client context but not `apps/auth/` rules.
7. Update the claim whenever a new target is added, a tool changes capability names, a subdirectory context is introduced, a hook/manual injection path changes, or a permission/security default changes.

## Feedback wanted

If your rule pack, skill bundle, or instruction manifest needs a different evidence shape, open a focused issue: https://github.com/caioribeiroclw-pixel/pluribus/issues/new

Do not paste private instructions, secrets, tokens, customer data, or proprietary source in public feedback.
