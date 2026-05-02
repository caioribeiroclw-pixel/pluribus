# Changelog

All notable changes to Pluribus are documented here.

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
