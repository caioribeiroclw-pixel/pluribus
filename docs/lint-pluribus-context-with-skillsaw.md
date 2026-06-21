# Lint `pluribus.md` with Skillsaw content paths

Use this when you want Skillsaw's content-quality rules to review a Pluribus source file without asking Skillsaw to treat `pluribus.md` as a built-in ecosystem default.

This is the right boundary while Pluribus adoption is still early: make the file auditable through user config first; reserve upstream built-in recognition for conventions with broad external usage.

## Minimal `.skillsaw.yaml`

From a project that keeps its shared context in `pluribus.md`:

```yaml
version: "0.10.1"

content-paths:
  - "pluribus.md"

exclude:
  - "node_modules/**"
  - "vendor/**"
  - "generated/**"

strict: false
```

Then run Skillsaw normally for the project. The file matched by `content-paths` is analyzed by Skillsaw's `content-*` rules alongside recognized instruction files such as `CLAUDE.md`, `AGENTS.md`, Cursor rules, and Copilot instructions.

## Team/shared context layouts

If your Pluribus source composes reusable context with imports, include the imported source files too:

```yaml
content-paths:
  - "pluribus.md"
  - "context/**/*.md"
  - "docs/ai-instructions/**/*.md"
```

Run Pluribus first when you want generated native files to be current:

```bash
npx --yes pluribus-context@latest audit --strict
npx --yes pluribus-context@latest sync --dry-run
```

## What this proves

This setup is useful for content hygiene only:

- weak or vague instruction language;
- critical constraints buried too late;
- contradictions across human/agent runbooks;
- instruction files that should be reviewed before sync.

It does **not** prove runtime load, model attention, MCP retrieval, compaction freshness, or whether an agent actually followed the file. For runtime evidence, use Pluribus receipts such as [context input evidence](context-input-evidence.md), [session preflight receipts](session-preflight-receipts.md), or [temporal context receipts](temporal-context-receipts.md).

## Why Pluribus is not asking for a Skillsaw built-in yet

Built-in recognition in third-party linters should follow broad independent adoption. Until `pluribus.md` has that evidence, the honest integration path is configurable `content-paths` plus project-specific rules.

If teams start using `pluribus.md` widely enough that maintainers ask for a default, the evidence should be external: repos, issues, docs, or users requesting support — not Pluribus asking to be blessed before the market has pulled it in.
