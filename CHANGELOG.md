# Changelog

All notable changes to Pluribus are documented here.

## 0.3.1 — npm README cleanup

### Changed

- Republish the post-0.3.0 README/docs cleanup so the npm package page no longer tells users that `audit` requires a source install or that npm latest may still be `0.2.0`.
- Clarify first-run write safety in the README and quickstart: `audit`, `validate`, and `sync --dry-run` are read-only; `init` writes only `pluribus.md`; `sync` writes only generated AI context files; remote import cache/lock writes require explicit `--update-imports`.
- Keep the published path explicit: `npx --yes pluribus-context@latest audit` is now the default first-run check.
- Clarify when Pluribus complements dedicated context linters/drift auditors versus replacing one-way sync maintenance.
- Expand package keywords for discoverability around `context-drift`, `AGENTS.md`, Cursor rules, and AI coding agents.
- Add a dedicated GitHub issue template for read-only `pluribus audit` feedback from real repos, plus links to the audit guide and workflow discussion.
- Make quickstart and audit feedback templates point to the current published `npx --yes pluribus-context@latest ...` commands so first-run reports are easier to reproduce.
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
- Normalize one-off `npx` examples to `npx --yes pluribus-context@latest ...` so copy-paste docs do not pause on npm's install prompt or rely on implicit latest resolution.
- Add explicit version-availability notes while `main` documents `0.3.1` audit CI flags and `init --dry-run`, while npm latest remains `0.3.0`.
- Use exact `github:caioribeiroclw-pixel/pluribus#main` source-install commands for unreleased `init --dry-run` previews so users do not accidentally run npm `0.3.0` commands that still write `pluribus.md`.
- Use exact `github:caioribeiroclw-pixel/pluribus#main` source-install commands for unreleased `audit --ci`, `--json`, `--output`, and `--github-annotations` docs and examples until `0.3.1` is published, so CI copy-paste paths do not imply those flags are available in npm `0.3.0`.
- Use `audit --ci` in the copy-paste GitHub Actions example to reduce command length.
- Clarify the README vision so the source of truth is `pluribus.md` plus optional `# @import` files, not an obsolete multi-file `pluribus/` directory layout.
- Add `pluribus init --dry-run` so first-time users can preview the `pluribus.md` scaffold before writing files.
- Add `npm run release:verify` to run the full release gate and report whether npm auth is the remaining publish blocker.
- Expand `npm run release:smoke` to verify the first-run `init --dry-run` preview and the copy-paste `audit --ci --json --output` path from the packaged tarball.
- Add `npm run published:smoke` to verify the currently published npm `latest` package still has a working public first-run path (`--version`, `--help`, read-only `audit`, `init`, `validate`, and `sync --dry-run`).
- Run the published npm smoke from `npm run release:verify` whenever a published package exists, so release readiness checks also validate the package users can install today.
- Extend the release verification guardrail to catch bare `pluribus ...` copy-paste examples with unreleased `init --dry-run` or CI/JSON audit flags while npm latest is still behind `main`.
- Make `npm run release:verify` distinguish missing npm auth from invalid/stale configured tokens, so the 0.3.1 publish path points to the right remediation without exposing credentials.
- Reject unknown CLI options per command before executing, so typoed or not-yet-published flags fail safely instead of being silently ignored.
- Make the packaged release smoke verify that unknown init flags fail without creating `pluribus.md`, so fail-safe option parsing is tested from the installed tarball, not only unit tests.
- Remove the unsupported `init --force` flag from the release smoke so release checks only exercise documented CLI behavior.
- Remove the same unsupported `init --force` flag from the published npm smoke so post-publish validation stays compatible with fail-safe unknown-option parsing.
- Make the published npm smoke verify fail-safe unknown-option parsing after `0.3.1` is published, so post-publish validation catches a regression back to silently ignored CLI flags.
- Update the bug report issue template to use non-interactive `pluribus-context@latest` reproduction commands and a current version placeholder, reducing stale first-run reports.
- Standardize README/docs/examples on `npx --yes pluribus-context@latest ...` for published commands and extend the release guard so unreleased flags are blocked with or without `@latest` while npm latest is behind `main`.
- Make `npm run published:smoke` verify the npm package README after `0.3.1` is published, catching stale package-page copy like `npx pluribus-context init` before future distribution pushes.
- Add `npm run release:publish` as the guarded publish path: it runs the full release verification before publishing, refuses credential-like CLI arguments, and runs the published npm smoke after a real publish.
- Extend `npm run release:verify` to check docs, examples, and issue templates for reproducible published npm commands (`npx --yes pluribus-context@latest ...`) and unreleased flags while npm latest is still behind `main`.
- Include `CONTRIBUTING.md` in the same release verification copy-paste scan, and update its audit feedback command to the reproducible `npx --yes pluribus-context@latest ...` form.
- Link audit feedback directly from the README/npm package page and make the published README smoke guard the quickstart + audit feedback paths.
- Link quickstart and audit docs directly to their issue templates, and verify those feedback paths in the release gate so first-run users do not have to choose a generic issue manually.
- Expand npm discovery keywords around agent rules, AI context, Codex/Aider, and drift detection so the package metadata matches the searches that surface adjacent tools.
- Rewrite the npm package description for search-result clarity and verify core discovery metadata in the release gate before publishing.
- Make the published npm smoke verify discovery description/keywords after `0.3.1` is published, so post-publish validation catches stale registry metadata before distribution pushes.
- Clarify the "When to use Pluribus" guide for users comparing adjacent rules-sync packages, with a sharper split between lightweight rules sync, tool-native prompt managers, one-way converters, and Pluribus' source-of-truth plus audit workflow.
- Make the published npm smoke verify that the package README keeps a visible path to the "When to use Pluribus" comparison guide after `0.3.1` is published.
- Run packaged CLI and published npm smoke checks in CI, so distribution regressions are caught on every push instead of only during local release prep.
- Surface npm weekly downloads and CI status badges in the README/npm package page, and verify those trust/distribution badges in the release and published smoke gates.
- Surface the audit feedback issue template directly from `pluribus audit` text and JSON output, so noisy first-run results can turn into structured reports without searching the docs.
- Verify the audit feedback link in packaged and published smoke checks, so the CLI feedback loop cannot disappear from the installed artifact unnoticed.
- Make global install examples explicit with `npm install -g pluribus-context@latest`, and have the release gate block ambiguous global install copy-paste commands.
- Keep `pluribus --help` in sync with the actual built-in tool adapters, and verify that in release/published smoke checks, so first-run users see Copilot, Windsurf, Continue, and Zed as supported `--tools` values instead of the original three-tool default.
- Add the full built-in adapter list to the quickstart and verify it in the release gate, so users can discover OpenClaw, Windsurf, Continue, and Zed before deciding which `--tools` values to try.

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
