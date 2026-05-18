<!-- pluribus:tools: claude,cursor,copilot,openclaw,bob -->

# Identity
This repository publishes an AI rule or skill bundle that claims portability across Claude Code, Cursor, GitHub Copilot, and AGENTS.md-compatible coding agents.

The bundle should be treated as portable only when its required capabilities, tested targets, known lossy targets, and fallback behavior are visible in review.

# Stack
- Source format: Markdown rules/skills maintained in git.
- Generated targets: `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `AGENTS.md`, and `.bob/rules/pluribus.md`.
- Review command: `npx --yes pluribus-context@latest sync --dry-run`.
- Drift command: `npx --yes pluribus-context@latest audit --json`.

# Conventions
- Do not use `universal` as a boolean portability claim.
- Describe portability as claims with evidence: tier, tested targets, required capabilities, project assumptions, known lossy targets, and fallback behavior.
- Treat `project-local` and `portable-with-loss` as honest labels, not failures.
- Keep target-native rules when a target has semantics that flat Markdown cannot preserve, such as path/glob activation or manual attachment behavior.
- When converting between tool formats, never silently drop security constraints, generated-file warnings, required read-before-plan steps, or scoped-rule metadata.

## Portability claim

```yaml
portability:
  tier: portable-with-adapters
  testedOn:
    - target: claude-code
      evidence: generated CLAUDE.md smoke-reviewed
    - target: cursor
      evidence: generated .cursorrules smoke-reviewed
    - target: github-copilot
      evidence: generated .github/copilot-instructions.md smoke-reviewed
    - target: agents-md
      evidence: generated AGENTS.md smoke-reviewed
    - target: bob
      evidence: generated .bob/rules/pluribus.md smoke-reviewed
  requiredCapabilities:
    - load repository instructions before planning
    - preserve generated-file warning
    - expose security constraints before edits
  knownLossyTargets:
    - target: flat-markdown-targets
      loss: cannot express Cursor-style path/glob activation without annotation
  fallback:
    - if a target cannot represent scoped activation, keep that scoped rule in the target-native file and document the loss
```

# Goals
1. Make portability claims falsifiable before users copy a rule pack into production.
2. Give maintainers a reviewable report of which targets were generated and where semantics may be lossy.
3. Help directory/list reviewers distinguish real multi-tool support from self-attested compatibility.
4. Keep one canonical source for shared claims while preserving target-native files for semantics that do not round-trip.

# Constraints
- Do not expose tokens, private instructions, customer data, internal paths, or proprietary source when reporting portability evidence.
- Do not claim that generated Markdown proves runtime load order, model behavior, permission mapping, MCP availability, or path/glob precedence.
- Do not flatten tool-specific security or activation semantics into a generic target without a visible fidelity warning.
- Do not replace human review of rule/skill substance with a passing sync or audit check.
