# Changelog

All notable changes to Pluribus are documented here.

## 0.3.1 — npm README cleanup

### Changed

- Republish the post-0.3.0 README/docs cleanup so the npm package page no longer tells users that `audit` requires a source install or that npm latest may still be `0.2.0`.
- Keep the published path explicit: `npx --yes pluribus-context audit` is now the default first-run check.
- Clarify when Pluribus complements dedicated context linters/drift auditors versus replacing one-way sync maintenance.
- Expand package keywords for discoverability around `context-drift`, `AGENTS.md`, Cursor rules, and AI coding agents.
- Add a dedicated GitHub issue template for read-only `pluribus audit` feedback from real repos, plus links to the audit guide and workflow discussion.
- Clarify that Pluribus detects file-level output drift, not runtime precedence issues where a tool deprioritizes a correct context file after compaction/summarization.
- Add a lightweight runtime-loading sanity check for users who want to confirm a generated context file is actually loaded before relying on it.
- Add a context drift taxonomy that separates file-level output drift, source-of-truth drift, runtime loading/precedence drift, and behavioral drift so users can choose the right check before adopting Pluribus.
- Add `pluribus audit --json` so CI jobs, smoke scripts, and external tools can consume drift results without parsing emoji/text output.
- Add `pluribus audit --github-annotations` for inline GitHub Actions check annotations when generated context files are missing or drifted.
- Add `pluribus audit --ci` as a shortcut for `--strict --github-annotations` in GitHub Actions.
- Add `schemas/audit-result.schema.json` to make the `pluribus audit --json` contract explicit for CI wrappers, dashboards, and migration tools.
- Add `pluribus audit --json --output <file>` so CI jobs can save audit results as artifacts without shell redirection or noisy stdout.
- Add a copy-paste CI audit guide and GitHub Actions example for enforcing generated context files in pull requests.
- Add a pre-commit audit guide and sample git hook for catching context drift before commits leave a developer machine.
- Make the README and quickstart choose between two safe first commands: read-only `audit` for existing repos and `init` for brand-new repos.
- Normalize one-off `npx` examples to `npx --yes pluribus-context ...` so copy-paste docs do not pause on npm's install prompt.
- Add explicit version-availability notes while `main` documents `0.3.1` audit CI flags and npm latest remains `0.3.0`.
- Use `audit --ci` in the copy-paste GitHub Actions example to reduce command length.

## 0.3.0 — Audit workflow and first-run docs alignment

### Added

- Add `pluribus audit`, a read-only command that compares generated tool files with `pluribus.md`, reports missing or drifted outputs, supports `--strict` for CI, and scans existing AI context files when a project has not adopted Pluribus yet.
- Add first-run docs for quickstart, context drift audit, existing context migration, context-file review, when to use Pluribus versus one-way converters, and issue templates so early users can report install, adapter, security-review, and migration friction with concrete details.

### Changed

- Align the package README for the npm publish so the npm package page shows the real `npx --yes pluribus-context` install path, npm badge, 60-second smoke test, `audit` workflow, and published-status roadmap.
- Replace temporary source-install notes with the published `pluribus-context@0.3.0` audit path.

## 0.2.0 — Package-ready CLI release

Pluribus 0.2.0 is the first npm-ready release of the CLI for keeping intentional AI context in one versioned source and syncing it to the files each tool expects. It supersedes the earlier GitHub-only v0.1.0 alpha release from March.

### Added

- `pluribus init` to scaffold a project `pluribus.md` context file.
- `pluribus validate` to catch missing sections, unresolved imports, duplicated top-level sections, and invalid tool names before syncing.
- `pluribus sync` to generate tool-specific context files.
- `pluribus watch` to debounce edits to `pluribus.md` and keep generated files fresh during local development.
- Built-in adapters for:
  - Claude Code (`CLAUDE.md`)
  - Cursor (`.cursorrules`)
  - GitHub Copilot (`.github/copilot-instructions.md`)
  - OpenClaw (`AGENTS.md`)
  - Zed (`.rules`)
  - Windsurf (`.windsurf/rules/pluribus.md`)
  - Continue (`.continue/rules/pluribus.md`)
- Local composable contexts via `# @import ./relative-file.md`.
- Explicit remote imports via `github:owner/repo/path.md[@ref]` and HTTPS URLs when running with `--update-imports`.
- Deterministic remote import lock/cache support through `pluribus.lock.json` and `.pluribus/cache/remote/`.
- Optional GitHub authentication for private GitHub imports through `GH_TOKEN`, `GITHUB_TOKEN`, or the logged-in GitHub CLI.
- Specs, examples, and docs for context format, adapter behavior, and composable contexts.

### Notes

- The npm package name is `pluribus-context` because `pluribus` is already occupied on npm by an unrelated package.
- The installed binary is still `pluribus`.
- Remote imports never fetch during normal `sync`/`validate`; network refresh is explicit via `--update-imports`.
- Tokens are never written to the lockfile or cache.

### Verification

- Local test suite: `npm test`.
- Package check: `npm pack --dry-run`.
- Publish check before release: `npm publish --dry-run`.
