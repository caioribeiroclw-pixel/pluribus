# Changelog

## [Unreleased]

All notable changes to Pluribus are documented here.

## 0.3.32 - 2026-05-26

- Added an executable compaction transaction/rollback receipt fixture for failed `/compact` runs, proving summary failure, `swap_committed=false`, original-context preservation, restored deferred-tool registry/system-reminder queue, and no stale reminder replay without logging raw transcript/tool output.
- Extended the context-budget guide, context input evidence docs, and context receipts Agent Skill recipe with compaction atomicity checks for failed summary calls and half-committed context state.

## 0.3.31 - 2026-05-26

- Added pruning/compaction smoke coverage to the context receipts Agent Skill and published `pluribus-context@0.3.31` so npm latest includes lifecycle receipts for pre-load, runtime boundary, and post-hoc pruning/protection.

## 0.3.30 - 2026-05-25

- Added executable pruning receipt fixtures for context-cleaning runs, covering start, per-strategy evaluation, completion, backup verification, protected counts, and privacy flags.

## 0.3.29 - 2026-05-25

- Added ToolSearch propagation receipt fixtures for Claude Code-style subagents, separating policy intent, `tools:` declaration shape, and runtime deferred-tool exposure.

## 0.3.28 - 2026-05-25

- Added per-agent MCP injection checks to the context receipts Agent Skill recipe and npm release, covering allowed/excluded servers, loaded/deferred definitions, and startup budget buckets.

## 0.3.27 - 2026-05-25

- Added a copyable Agent Skill recipe for privacy-safe context receipts, with 60-second smokes for Tool Search/lazy MCP, skill/prompt context, and subagent/manager boundaries.
- Linked the recipe from the README and context-budget receipts guide so reviewers can install or inspect a concrete `SKILL.md` instead of reverse-engineering the receipt fixtures.

## 0.3.26 - 2026-05-24

- Added the public context-budget receipts guide, connecting subagent boot budget, delegation boundaries, MCP manager isolation, MCP gateway progressive disclosure, and CLI progressive disclosure under one diagnostic frame: what ate the agent's context before or after the task.
- Published the GitHub release and npm catch-up so `pluribus-context@latest` includes the context-budget receipts docs and fixtures.

## 0.3.25 - 2026-05-23

- Re-aligned npm package discovery metadata so the public package description preserves core search terms (`AI context`, `rules sync`, `Claude.md`, `Claude Code`, `Cursor`, and `Copilot instructions`) while retaining the new privacy-safe context receipts positioning.
- Prepared the npm distribution catch-up from GitHub/local `0.3.24` to public `0.3.25`, so users reached through external PRs can install the current receipt demos and docs via `pluribus-context@latest`.

## 0.3.24 - 2026-05-22

- Added the `Context receipts for agent observability` guide, positioning privacy-safe receipts as evidence for what crossed an agent context boundary alongside OpenTelemetry spans and agent-run traces.
- Added executable context receipt demos for context input loading, post-hoc session-log conversion, skill/plugin invocation, AGENTS.md overlays, shared-memory retrieval, memory consolidation, governance delete/forget, self-remediating brain/doctor runs, context compaction, MCP Tool Search, and GitHub MCP secret scanning.
- Added OpenTelemetry-style trace fixtures that preserve hashes, counts, buckets, lifecycle state, selection/suppression decisions, and audit gaps without exporting raw prompts, secrets, tool outputs, memory bodies, transcripts, or private paths.
- Extended discovery smoke tracking for external context-observability, MCP, memory, skills, and directory/list feedback channels so artifact-first distribution attempts remain measurable.
- Updated README/docs links so users and reviewers can find context receipts from the package page and run the shipped examples from the npm tarball.

## 0.3.23 - 2026-05-19

- Extended `pluribus audit --fidelity-report` with `duplicateLoadEvidence` so reviewers can see the generated candidate, content hash, inferred selected load, and the explicit fact that runtime scanner roots/caches/plugin duplicates are not yet inspected.
- Added `duplicate-load-selection-not-proven` warnings and semantic markers to avoid treating multi-root skill/rule discovery as safe without a selection/suppression receipt.
- Updated the audit JSON schema and fidelity docs for duplicate skill/context load receipts inspired by Cursor/Claude duplicate-context reports.

## 0.3.22 - 2026-05-19

- Extended `pluribus audit --fidelity-report` with `loadEvidence` receipts so reviewers can see whether generated context is expected to enter through native file discovery or a generic agent fallback.
- Added explicit runtime dedupe uncertainty via `load-dedupe-not-proven` warnings and `runtime-load-dedupe-not-proven` semantic markers, making native-vs-hook-vs-manual duplication an evidence question.
- Updated the audit JSON schema, community review packet, README shortcut, and portability fidelity docs with `loadedBy`, `effectiveSource`, hook/session-start flags, resume behavior, and dedupe risk.

## 0.3.21 - 2026-05-19

- Extended `pluribus audit --fidelity-report` with `effectiveContext` evidence so monorepo reviewers can see that built-in targets currently prove repo-root context only, not root→subpath inheritance or path isolation.
- Added an explicit `effective-context-is-repo-root` warning and `no-path-scope-evidence` semantic marker to avoid treating generated root instruction files as proof of subdirectory behavior.
- Updated the community review packet and portability fidelity docs to frame monorepo path scope as an evidence question: what context does the agent actually load from `apps/client/`?

## 0.3.20 - 2026-05-18

- Added a 60-second native-vs-fallback smoke to the community review packet so directory/list reviewers can see Bob native `.bob/rules/*.md` differ from OpenClaw/AGENTS.md generic fallback.
- Extended `npm run review:smoke` to execute that fidelity demo against the published npm package and assert `nativeDiscoverySurface`, `genericFallback`, and `manualActivationRequired` fields.


## 0.3.19 — Bob native discovery target

### Added

- Add a built-in `bob` adapter that writes `.bob/rules/pluribus.md`, so Pluribus can test native discovery surfaces instead of forcing Bob-style rules through generic `AGENTS.md` fallback.
- Extend public docs, quickstart, contributor guidance, and portability fidelity examples with Bob rules as a target for native-discovery vs generic-fallback review.

## 0.3.18 — fidelity audit discovery positioning

### Changed

- Reposition npm and README copy around AI-agent context fidelity audit and semantic drift detection, so package/directory discovery surfaces see the current wedge before generic context sync.
- Track npm/GitHub discovery queries for `AI agent context fidelity audit` and `semantic drift agent context`, making the new positioning falsifiable instead of subjective.

## 0.3.17 — native discovery fidelity evidence

### Changed

- Extend `pluribus audit --fidelity-report` with `nativeDiscoverySurface`, `resolutionAnchor`, `genericFallback`, `manualActivationRequired`, and `semanticDifference` fields so reviewers can distinguish copied files from target-native discovery and semantic preservation.
- Document the new fidelity report fields for rule/skill bundle maintainers reviewing multi-agent installer claims.

## 0.3.16 — audit fidelity evidence

### Added

- Add `pluribus audit --fidelity-report` so maintainers can emit target-by-target portability evidence in JSON or human output: represented sections, unsupported sections, activation shape, warnings, and the next step before claiming a rule/skill bundle is universal.
- Update the portability fidelity report guide to use `audit --json --fidelity-report` as the reproducible evidence artifact for directory reviewers and rule/skill bundle maintainers.

## 0.3.15 — portability fidelity report demo

### Added

- Add a portability fidelity report guide and example for AI rule/skill bundle maintainers who need evidence-based compatibility claims across `CLAUDE.md`, Cursor, Copilot, and `AGENTS.md` outputs.
- Link the new report from the README so directory reviewers and skill/rule authors can test portability claims without treating `universal` as a self-attested boolean.

## 0.3.14 — coordination contract demo

### Added

- Add a multi-session coordination contract guide and example for teams experimenting with Claude Code event logs, `.coordination/` ledgers, MCP/A2A relays, or parallel agent worktrees.
- Document authority handoff topics (`authority.claimed`, `authority.delegated`, `authority.released`) so shared schemas, generated clients, release branches, and infra config have explicit owners instead of silent conflict.

## 0.3.13 — external memory docs tracking

### Changed

- Track the MemoryGraph docs PR in `discovery:smoke` so adjacent MCP memory feedback is measured alongside awesome-list distribution attempts.

## 0.3.12 — MCP memory handoff demo

### Added

- Add an MCP memory handoff demo and guide showing how Pluribus can keep recall/store protocols aligned across Claude Code, Cursor, Copilot, OpenClaw, Windsurf, Continue, and Zed without becoming a memory server.

### Changed

- Track the `jqueryscript/awesome-claude-code` distribution PR in `discovery:smoke`, so the second contextual listing attempt is measured alongside the existing AI coding tools PR.

## 0.3.11 — npm discovery metadata alignment

### Changed

- Patch the npm package description to include both `CLAUDE.md` and `Claude Code`, keeping the sharpened discovery metadata compatible with the published smoke gate after `0.3.10` exposed the mismatch.
- Make the published smoke gate tolerate the already-published `0.3.10` metadata while requiring the stricter `Claude Code` description from `0.3.11` onward.
- Make `discovery:smoke` report both the published npm package and the local `package.json` plus a `pendingNpmPublish` summary, so adoption/search evidence is not misread while `0.3.10` metadata is prepared but npm latest is still `0.3.9`.
- Refresh package discovery metadata for the next npm publish by putting `CLAUDE.md`, `rules sync`, and `Copilot instructions` in the package description and guarding adjacent npm-search keywords in `release:verify`.
- Link review/listing feedback from the README contribution CTA and CONTRIBUTING guide, and guard those links in `release:verify`, so directory maintainers and package reviewers can find the dedicated route even when they do not start from the Community Review Packet.
- Add a dedicated review/listing feedback issue template and link it from the Community Review Packet, so directory maintainers and package reviewers can report categorization/copy/safety friction without forcing the feedback into audit or quickstart forms.
- Replace stale current-facing `pluribus-context@0.3.3` availability claims in audit docs with `pluribus-context@latest` and guard public docs against future hard-coded package-version claims that look current.
- Make `release:verify` detect stale local/remote `v<package version>` tags, so a prepared npm release cannot accidentally drift from its GitHub release artifact.
- Add an exact awesome-list Markdown entry to the Community Review Packet and guard it in `release:verify`, so contextual list submissions can reuse one honest, tested line instead of rewriting category copy per channel.
- Add a Fit and boundaries section to the Community Review Packet and guard it in `release:verify`, so reviewers can quickly distinguish Pluribus from one-tool rules managers, one-time converters, memory layers, retrieval, and agent orchestration.
- Add license and install/run fields to the Community Review Packet's directory submission table and guard them in `release:verify`, so curators do not have to infer basic listing metadata before testing Pluribus.

## 0.3.10 — discovery and reviewer routing refresh

### Added

- Add `npm run review:smoke` and wire it into `release:verify` so the Community Review Packet's public 60-second smoke test is exercised against `pluribus-context@latest` before release/distribution pushes.
- Add the Community Review Packet to GitHub's issue/contact chooser and guard that link in `release:verify`, so reviewers who click “New issue” can still find directory copy, safety notes, feedback links, and the 60-second smoke test.
- Track external distribution PRs in `discovery:smoke`, starting with the contextual `awesome-ai-coding-tools` submission, so manual listing experiments have state/mergeability/comment evidence in the adoption baseline.
- Add explicit feedback links to the community review packet and guard them in `release:verify`, so reviewers can route audit feedback, quickstart confusion, or broader workflow notes without hunting through the repo.
- Add recent discussion comment authors and an external-comment count to the discovery smoke report so maintainer-only discussion updates do not look like community feedback.
- Add GitHub repo signals to the discovery smoke report so adoption/distribution checks track stars, forks, watchers, open issues, open pull requests, and discussions alongside npm search/download signals.
- Add npm download counts to the discovery smoke report so adoption/distribution checks track search visibility and package activity together.
- Add `npm run discovery:smoke` and `docs/discovery-smoke.md` so npm/GitHub search visibility can be measured repeatably after metadata, topic, README, or distribution-copy changes.

### Changed

- Surface the Community Review Packet near the top of the README and guard the reviewer shortcut copy in `release:verify`, so curators and package reviewers can find directory fields, safety notes, feedback links, and the 60-second smoke test before scanning the full docs.
- Make the README intro say explicitly that `pluribus-context` is an AI context sync CLI and guard that positioning in `release:verify`, improving package-name/problem-query clarity for reviewers and search surfaces.
- Extend the release smoke gate to install the packed CLI globally into a temporary prefix and verify `npm uninstall -g pluribus-context` removes the `pluribus` binary, protecting the first-run removability claim used in trust/review copy.

## 0.3.9 — npm discovery metadata refresh

### Added

- Add exact npm discovery keywords for adjacent searches such as `context-sync`, `claude-md`, `ai-rules`, `rules-sync`, `context-files`, and `ai-agents`.
- Add a release-verification guard for the community review packet so directory submission fields, safe first command, privacy guardrails, uninstall/network copy, and the <=280-character blurb cannot silently drift before distribution pushes.

### Changed

- Refresh the context-drift audit example with current published-package commands and generated fixtures so reviewers can reproduce the intended one-file drift signal from `pluribus-context@latest`.

## 0.3.8 — package-page directory field visibility

### Changed

- Make the README/npm package page explicitly mention the community review packet's directory submission fields, so curators can find the structured listing copy without opening the packet first.

## 0.3.7 — directory submission packet refresh

### Added

- Add structured directory-submission fields to the community review packet so small distribution/review forms can reuse one safe, consistent Pluribus listing without rewriting install or safety copy.

## 0.3.6 — community review packet package-page refresh

### Added

- Add a community review packet with listing copy, safety/removability notes, and a disposable 60-second smoke test for reviewers, curators, and small distribution opportunities.

## 0.3.5 — trust copy package-page refresh

### Changed

- Clarify installation, uninstallation, and network behavior in the README and quickstart so first-run reviewers can verify the CLI without guessing what persists or when remote imports make network requests.
- Add release-gate checks for uninstall/network transparency copy before future docs or package-page updates.

## 0.3.4 — npm package page README refresh prep

### Changed

- Replace pre-publish GitHub-tag workaround commands in README, quickstart, migration, CI audit, and drift-audit docs with the published `pluribus-context@0.3.3` npm path now that `latest` is current.
- Let `release:verify` run as a post-publish verification gate when npm `latest` already matches `package.json`, while preserving unreleased-copy checks when `main` is ahead of npm.
- Mark this docs-only patch as copy-paste compatible with `pluribus-context@0.3.3`, so the release gate can prepare a package-page README refresh without forcing temporary GitHub-tag workaround commands back into docs that already work on the current npm package.
- Extend `published:smoke` to reject the stale `github:caioribeiroclw-pixel/pluribus#v0.3.3` package-page workaround once npm `latest` reaches `0.3.4`.

## 0.3.3 — Publish-window rehearsal hardening

### Changed

- Make the guarded `release:publish -- --dry-run` rehearsal check the same Git tag/HEAD alignment before any live OTP window, so tag drift is caught without touching npm.
- Carry the pending source-install documentation forward to the immutable GitHub `v0.3.3` tag while npm `latest` remains `0.3.0`.

## 0.3.2 — Release artifact reconciliation

### Changed

- Reconcile the npm publish target after the GitHub `v0.3.1` tag drifted from `main`: bump the pending npm release to `0.3.2` so the next publish can map to a fresh immutable GitHub tag instead of reusing the older `v0.3.1` artifact.
- Guard `release:publish` against publishing an npm package version from a different commit than its matching GitHub release tag.
- Keep temporary source-install documentation pinned to the immutable GitHub release tag for the package version being prepared while npm `latest` remains `0.3.0`.

## 0.3.1 — npm README cleanup

### Changed

- Pin temporary source-install documentation to the immutable GitHub release tag `v0.3.2` instead of `main` while npm `latest` remains `0.3.0`, and make the release verifier accept the versioned tag path for unreleased `0.3.2` commands.
- Block moving GitHub source-install references in docs, examples, issue templates, and changelog while npm `latest` is behind the local package, so partial-release copy-paste paths stay tied to the immutable tag.
- Clarify the npm 2FA publish path in the release checklist, including the guarded `npm run release:publish -- --otp <one-time-code>` command and the rule to pause distribution if a GitHub release exists before npm `latest` is updated.
- Verify that `docs/pre-commit-audit.md` embeds the same hook body as `examples/git-hooks/pre-commit`, so the local copy-paste guard and packaged git-hook example cannot drift into different audit commands.
- Verify that `docs/ci-audit-example.md` includes an exact copy of `examples/github-actions/pluribus-audit.yml`, so the copy-paste CI guide and packaged workflow example cannot drift into different audit commands.
- Run the full `npm run release:verify` gate in CI, with CI-safe detached checkout handling, so local-only release guards for docs, package metadata, npm smoke, tarball smoke, and publish dry-run cannot drift behind the public pipeline.
- Verify that docs and contributor-facing GitHub issue-template links point to existing `.github/ISSUE_TEMPLATE` files, and that every public feedback template is linked somewhere in the docs, so first-run feedback paths cannot silently 404 or disappear.
- Make `npm run release:publish` require the public `latest` dist-tag and verify that `npm view pluribus-context version` matches the just-published package before running `published:smoke`, and verify the publish script syntax in `release:verify`, so a publish under the wrong tag cannot look successful.
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
- Add explicit version-availability notes while `main` documents `0.3.2` audit CI flags and `init --dry-run`, while npm latest remains `0.3.0`.
- Use exact `github:caioribeiroclw-pixel/pluribus#v0.3.2` tag-install commands for `init --dry-run` previews so users do not accidentally run npm `0.3.0` commands that still write `pluribus.md`.
- Use exact `github:caioribeiroclw-pixel/pluribus#v0.3.2` tag-install commands for `audit --ci`, `--json`, `--output`, and `--github-annotations` docs and examples until `0.3.2` is published to npm, so CI copy-paste paths do not imply those flags are available in npm `0.3.0`.
- Use `audit --ci` in the copy-paste GitHub Actions example to reduce command length.
- Clarify the README vision so the source of truth is `pluribus.md` plus optional `# @import` files, not an obsolete multi-file `pluribus/` directory layout.
- Add `pluribus init --dry-run` so first-time users can preview the `pluribus.md` scaffold before writing files.
- Add `npm run release:verify` to run the full release gate and report whether npm auth is the remaining publish blocker.
- Expand `npm run release:smoke` to verify the first-run `init --dry-run` preview and the copy-paste `audit --ci --json --output` path from the packaged tarball.
- Add `npm run published:smoke` to verify the currently published npm `latest` package still has a working public first-run path (`--version`, `--help`, read-only `audit`, `init`, `validate`, and `sync --dry-run`).
- Run the published npm smoke from `npm run release:verify` whenever a published package exists, so release readiness checks also validate the package users can install today.
- Extend the release verification guardrail to catch bare `pluribus ...` copy-paste examples with unreleased `init --dry-run` or CI/JSON audit flags while npm latest is still behind `main`.
- Make `npm run release:verify` distinguish missing npm auth from invalid/stale configured tokens, so the 0.3.2 publish path points to the right remediation without exposing credentials.
- Reject unknown CLI options per command before executing, so typoed or not-yet-published flags fail safely instead of being silently ignored.
- Make the packaged release smoke verify that unknown init flags fail without creating `pluribus.md`, so fail-safe option parsing is tested from the installed tarball, not only unit tests.
- Remove the unsupported `init --force` flag from the release smoke so release checks only exercise documented CLI behavior.
- Remove the same unsupported `init --force` flag from the published npm smoke so post-publish validation stays compatible with fail-safe unknown-option parsing.
- Make the published npm smoke verify fail-safe unknown-option parsing after `0.3.2` is published, so post-publish validation catches a regression back to silently ignored CLI flags.
- Update the bug report issue template to use non-interactive `pluribus-context@latest` reproduction commands and a current version placeholder, reducing stale first-run reports.
- Standardize README/docs/examples on `npx --yes pluribus-context@latest ...` for published commands and extend the release guard so unreleased flags are blocked with or without `@latest` while npm latest is behind `main`.
- Make `npm run published:smoke` verify the npm package README after `0.3.2` is published, catching stale package-page copy like `npx pluribus-context init` before future distribution pushes.
- Add `npm run release:publish` as the guarded publish path: it runs the full release verification before publishing, refuses credential-like CLI arguments, and runs the published npm smoke after a real publish.
- Extend `npm run release:verify` to check docs, examples, and issue templates for reproducible published npm commands (`npx --yes pluribus-context@latest ...`) and unreleased flags while npm latest is still behind `main`.
- Include `CONTRIBUTING.md` in the same release verification copy-paste scan, and update its audit feedback command to the reproducible `npx --yes pluribus-context@latest ...` form.
- Link audit feedback directly from the README/npm package page and make the published README smoke guard the quickstart + audit feedback paths.
- Link quickstart and audit docs directly to their issue templates, and verify those feedback paths in the release gate so first-run users do not have to choose a generic issue manually.
- Expand npm discovery keywords around agent rules, AI context, Codex/Aider, and drift detection so the package metadata matches the searches that surface adjacent tools.
- Rewrite the npm package description for search-result clarity and verify core discovery metadata in the release gate before publishing.
- Make the published npm smoke verify discovery description/keywords after `0.3.2` is published, so post-publish validation catches stale registry metadata before distribution pushes.
- Clarify the "When to use Pluribus" guide for users comparing adjacent rules-sync packages, with a sharper split between lightweight rules sync, tool-native prompt managers, one-way converters, and Pluribus' source-of-truth plus audit workflow.
- Make the published npm smoke verify that the package README keeps a visible path to the "When to use Pluribus" comparison guide after `0.3.2` is published.
- Run packaged CLI and published npm smoke checks in CI, so distribution regressions are caught on every push instead of only during local release prep.
- Surface npm weekly downloads and CI status badges in the README/npm package page, and verify those trust/distribution badges in the release and published smoke gates.
- Surface the audit feedback issue template directly from `pluribus audit` text and JSON output, so noisy first-run results can turn into structured reports without searching the docs.
- Verify the audit feedback link in packaged and published smoke checks, so the CLI feedback loop cannot disappear from the installed artifact unnoticed.
- Make global install examples explicit with `npm install -g pluribus-context@latest`, and have the release gate block ambiguous global install copy-paste commands.
- Keep `pluribus --help` in sync with the actual built-in tool adapters, and verify that in release/published smoke checks, so first-run users see Copilot, Windsurf, Continue, and Zed as supported `--tools` values instead of the original three-tool default.
- Add the full built-in adapter list to the quickstart and verify it in the release gate, so users can discover OpenClaw, Windsurf, Continue, and Zed before deciding which `--tools` values to try.
- Make issue templates ask for the exact `--version` output instead of a hard-coded version placeholder, and verify that guard in the release gate so feedback stays accurate while npm latest and `main` differ.
- Align `CONTRIBUTING.md` with the current built-in adapter list and integration request template, and verify that contributor-facing adapter guidance does not drift behind the CLI.
- Verify all built-in adapter outputs in packaged and published smoke checks, so docs/help cannot claim OpenClaw, Windsurf, Continue, or Zed support while the installed artifact fails to generate their files.
- Verify README/npm package-page adapter output copy in release and published smoke checks, so the top-of-funnel landing page cannot regress to the old three-tool story while the CLI supports more adapters.
- Verify that relative links from the README/npm package page point to files included in the npm tarball, so published docs links do not break after packaging.
- Extend packaged Markdown link verification beyond the README to docs/spec/examples in the npm tarball, so follow-on package-page navigation cannot drift to missing files.

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
