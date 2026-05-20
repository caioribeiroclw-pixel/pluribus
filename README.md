# Pluribus

[![npm version](https://img.shields.io/npm/v/pluribus-context?style=flat-square)](https://www.npmjs.com/package/pluribus-context)
[![npm downloads](https://img.shields.io/npm/dw/pluribus-context?style=flat-square)](https://www.npmjs.com/package/pluribus-context)
[![CI](https://img.shields.io/github/actions/workflow/status/caioribeiroclw-pixel/pluribus/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/caioribeiroclw-pixel/pluribus/actions/workflows/ci.yml)
[![Building in Public](https://img.shields.io/badge/building-in%20public-orange?style=flat-square)](https://x.com/RibeiroCaioCLW)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

> Detect where AI-agent context loses fidelity across tools — then sync the parts that can be safely shared.

Pluribus (`pluribus-context` on npm, `pluribus` on the command line) is an AI context sync CLI with AI-agent context fidelity audit for teams and projects that use Claude Code, Cursor, GitHub Copilot, OpenClaw, Windsurf, Continue, Zed, or Bob.

It shows where instructions keep their semantics, where they are downgraded to a generic fallback, and where manual activation or native discovery matters — then keeps project instructions, conventions, constraints, and team context in one versioned source of truth.

It is **not** a persistent memory layer, retrieval system, agent orchestrator, or agent-merging framework. Think `CLAUDE.md`, `.cursorrules`, `copilot-instructions.md`, `AGENTS.md` — one intentional context, multiple generated outputs.

**Reviewer shortcut:** evaluating Pluribus for a list, newsletter, package roundup, or tool directory? Use the [Community Review Packet](docs/community-review-packet.md) for copy-paste directory submission fields, safety/removability notes, feedback links, and a disposable 60-second smoke test. If you only run one command, try `npx --yes pluribus-context@latest audit --json --fidelity-report` to see native discovery surfaces, generic fallbacks, load evidence, duplicate-load selection evidence, manual activation requirements, effective context scope, and semantic differences.

---

## The Problem

You use Claude, Copilot, Cursor, Windsurf, Continue, Zed, Bob, ChatGPT, and whatever ships next Tuesday.

Each one has its own way of understanding your project:
- `CLAUDE.md` for Claude Code
- `copilot-instructions.md` for GitHub Copilot
- `.cursorrules` for Cursor
- `AGENTS.md` for OpenClaw
- `.windsurf/rules/pluribus.md` for Windsurf Cascade
- `.continue/rules/pluribus.md` for Continue
- `.rules` for Zed
- `.bob/rules/pluribus.md` for Bob

You end up maintaining **5+ files** that say roughly the same thing — your project's architecture, conventions, tech stack, who you are, what matters. Copy-paste across files. They drift. They rot. You forget to update one. Your AI gives you wrong answers because it's reading stale context.

**This is a multiplying problem.** Every new AI tool = another context file = more maintenance = more drift.

## The Vision

**Pluribus** is a universal format for intentional context in AI-assisted development.

Write your project context **once**, in `pluribus.md`. Keep it as a single file for small projects, or compose shared team/org Markdown with `# @import` when the context needs to be reused.

```text
your-project/
├── pluribus.md                  # source of truth
└── shared/
    ├── team-context.md          # optional imported conventions
    └── security-constraints.md  # optional imported guardrails
```

Then preview or sync:

```bash
npx --yes pluribus-context@latest sync --dry-run
npx --yes pluribus-context@latest sync
```

And it generates the right files for each tool:
- `CLAUDE.md` ← for Claude Code
- `.github/copilot-instructions.md` ← for Copilot
- `.cursorrules` ← for Cursor
- `AGENTS.md` ← for OpenClaw
- `.windsurf/rules/pluribus.md` ← for Windsurf Cascade
- `.continue/rules/pluribus.md` ← for Continue
- `.rules` ← for Zed
- `.bob/rules/pluribus.md` ← for Bob

**One source of truth. Zero drift.**

## Why `.md`?

- It's **human-readable** — you can review it, version it, PR it
- It's **universal** — every tool already parses markdown
- It's **composable** — import shared contexts across projects
- It's **versionable** — git diff your AI context like you diff your code
- It's **simple** — no YAML schemas, minimal JSON only when you opt into locked remote imports

## Getting Started

### Pick the safe first command

If your repo already has AI context files such as `CLAUDE.md`, `.cursorrules`, Copilot instructions, or `AGENTS.md`, start with the read-only audit:

```bash
npx --yes pluribus-context@latest audit
```

It does not write files. Without `pluribus.md`, it lists existing AI context surfaces so you can decide what to migrate. With `pluribus.md`, it reports generated files that are missing or drifted.

If you are starting from scratch, preview the source-of-truth scaffold first, then create it when it looks right:

```bash
# Preview only; does not write files:
npx --yes pluribus-context@latest init --dry-run

# Write pluribus.md when the preview looks right:
npx --yes pluribus-context@latest init
```

### What Pluribus writes

Pluribus is intentionally narrow about filesystem changes:

- `audit`, `validate`, and `sync --dry-run` are read-only.
- `init` writes `pluribus.md` only. If that file already exists, it refuses to overwrite it.
- `sync` writes only the configured/generated AI context files such as `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `AGENTS.md`, Windsurf/Continue rules, Zed `.rules`, and Bob `.bob/rules/pluribus.md`.
- Generated files include a `Generated by Pluribus ... do not edit manually` header so drift is easy to spot in review.
- Remote imports only touch `pluribus.lock.json` and `.pluribus/cache/remote/` when you explicitly pass `--update-imports`.

When in doubt, run `npx --yes pluribus-context@latest audit` or `npx --yes pluribus-context@latest sync --dry-run` first.

### Install, uninstall, and network behavior

```bash
# Install globally if you prefer a persistent `pluribus` command
npm install -g pluribus-context@latest
pluribus --help

# Remove the global CLI later
npm uninstall -g pluribus-context
```

For local development:

```bash
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus
npm link

# Remove the local global link later
npm unlink -g pluribus-context
```

One-off `npx --yes pluribus-context@latest ...` commands install into npm's normal temporary cache and do not create a persistent global `pluribus` command.

Pluribus does **not** make network requests during normal `audit`, `validate`, `sync`, or `sync --dry-run` runs. Network access is opt-in for remote imports only when you explicitly pass `--update-imports`; those fetches are limited to `github:`/HTTPS imports, then pinned in `pluribus.lock.json` and cached locally for deterministic offline syncs. Private GitHub imports may use `GH_TOKEN`/`GITHUB_TOKEN` or `gh auth token` during that explicit refresh, but tokens are never written to the lockfile or cache.

### 60-second smoke test

Want to see exactly what gets generated before adding it to a real project?

```bash
mkdir pluribus-demo && cd pluribus-demo
# Preview only; does not write files:
npx --yes pluribus-context@latest init --dry-run --name "Ana" --description "A Node.js service" --tools claude,cursor,copilot

# Write pluribus.md when the preview looks right:
npx --yes pluribus-context@latest init --name "Ana" --description "A Node.js service" --tools claude,cursor,copilot
npx --yes pluribus-context@latest validate
npx --yes pluribus-context@latest sync --dry-run
```

If the preview looks right, run `npx --yes pluribus-context@latest sync` to write the tool-specific files.

For a fuller walkthrough, see the [Quickstart](docs/quickstart.md). To enforce generated context files in pull requests, use the [CI audit example](docs/ci-audit-example.md); to catch drift before commits leave your machine, use the [Pre-commit Audit Hook](docs/pre-commit-audit.md). If your repo already has `CLAUDE.md`, `.cursorrules`, Copilot instructions, or `AGENTS.md`, run a [Context Drift Audit](docs/context-drift-audit.md) first, try the intentionally drifted [audit example](examples/context-drift-audit/), then follow [Migrate Existing AI Context Files](docs/migrate-existing-context.md). If you switch between Cursor, Claude Code, Copilot, and terminal agents, try the [Cursor ↔ Claude Code context handoff guide](docs/cursor-claude-context-handoff.md) and its [example source file](examples/context-handoff/pluribus.md). If you run multiple AI sessions on the same project, try the [Coordination Contract guide](docs/coordination-contract.md) and its [example source file](examples/coordination-contract/pluribus.md) to keep event-log/scratchpad protocol rules aligned without turning Pluribus into an orchestrator. If you evaluate code-search, MCP retrieval, RAG-over-notes, or agent memory tools, use the [Orchestration-layer Search Receipts](docs/orchestration-search-receipts.md) sketch to measure retrieved context from the harness layer without asking retrieval tools to inspect whole transcripts. If you publish AI rules, skills, or instruction bundles as "portable", use the [Portability Fidelity Report](docs/portability-fidelity-report.md) and its [example source file](examples/portability-fidelity/pluribus.md) to make compatibility claims evidence-based instead of self-attested. Before committing shared or generated AI instructions, use the [Context File Review Checklist](docs/context-file-review.md). If you're deciding between Pluribus and a one-way rules converter, see [When to use Pluribus](docs/when-to-use-pluribus.md). If you are debugging "context drift" after compaction or long sessions, start with the [Context Drift Taxonomy](docs/context-drift-taxonomy.md) to separate file drift from runtime precedence drift. If you use MCP memory or knowledge-graph tools, try the [MCP memory handoff demo](docs/memory-mcp-handoff.md) to keep recall/store protocols aligned across AI coding tools without turning Pluribus into a memory server. If you are reviewing Pluribus for a list, newsletter, or tool directory, use the [Community Review Packet](docs/community-review-packet.md) for directory submission fields, a one-line description, safety notes, and a disposable 60-second smoke test. Maintainers can track package/repo discovery with the [Discovery Smoke Checks](docs/discovery-smoke.md).

### Usage

**1. Initialize your context file**

```bash
cd your-project/
# Preview only; does not write files:
npx --yes pluribus-context@latest init --dry-run

# Write pluribus.md when the preview looks right:
npx --yes pluribus-context@latest init
```

The dry-run prints the scaffold without writing files. The second command creates `pluribus.md` with all required sections scaffolded. Fill in your project context.

You can also use flags for non-interactive init, including the same dry-run preview:

```bash
# Preview only; does not write files:
npx --yes pluribus-context@latest init --dry-run --name "Ana" --description "A background job runner" --tools claude,cursor,openclaw

# Write pluribus.md when the preview looks right:
npx --yes pluribus-context@latest init --name "Ana" --description "A background job runner" --tools claude,cursor,openclaw
```

**2. Edit `pluribus.md`**

Fill in your context once:

```markdown
# Identity
I am Ana, building **Conduit** — a background job runner for Node.js.

# Stack
- Language: TypeScript 5.4
- Runtime: Node.js 22 LTS
- ...

# Conventions
- async/await everywhere — no .then()/.catch()
- ...

# Goals
1. Zero external infrastructure
2. Type safety end-to-end
...

# Constraints
- Never introduce native-compile dependencies
- ...
```

**3. Compose shared context when needed**

For team or org-wide conventions, import shared Markdown files before your local project sections:

```markdown
# @import ./shared/team-context.md
# @import ./shared/security-constraints.md

# Identity
I am Ana, building **Conduit** — a background job runner for Node.js.
```

Local sections are applied after imported sections, so project-specific context can override shared context. See [Composable Contexts](docs/composable-contexts.md) for details.

**4. Validate before syncing**

```bash
pluribus validate
```

This checks that `pluribus.md` exists, imports resolve, required sections are present, top-level sections are not duplicated, and any `pluribus:tools` comment uses supported tool names.

If you use remote imports and want to refresh the lock/cache while validating:

```bash
pluribus validate --update-imports
```

**5. Audit generated files before syncing**

```bash
pluribus audit
```

This is read-only. It compares existing generated files with what `pluribus.md` would produce, reports missing or drifted outputs, and can run in CI with `--strict`:

```bash
pluribus audit --strict
```

In GitHub Actions, add annotations so drift appears inline in the check UI:

```bash
npx --yes pluribus-context@latest audit --strict --github-annotations
```

For GitHub Actions, `--ci` is the shorter equivalent of `--strict --github-annotations`:

```bash
npx --yes pluribus-context@latest audit --ci
```

For CI scripts, dashboards, or migration tooling, use machine-readable output:

```bash
npx --yes pluribus-context@latest audit --strict --json
```

To save the JSON as a CI artifact while keeping stdout quiet, add `--output`:

```bash
npx --yes pluribus-context@latest audit --strict --json --output pluribus-audit.json
```

The JSON shape is documented in [`schemas/audit-result.schema.json`](schemas/audit-result.schema.json) so CI wrappers and dashboards can validate integrations without scraping human output. For copy-paste enforcement, see the [CI audit example](docs/ci-audit-example.md) and the [Pre-commit Audit Hook](docs/pre-commit-audit.md).

If your project does not have `pluribus.md` yet, `pluribus audit` scans for known AI context files (`CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, Windsurf, Continue, Zed, Bob) so you know what to migrate.

**6. Sync to all your tools**

```bash
pluribus sync
```

If you use remote imports, refresh and pin them explicitly:

```bash
pluribus sync --update-imports
```

That writes `pluribus.lock.json` plus a local `.pluribus/cache/remote/` content cache. Future plain `pluribus sync` runs resolve those remote imports from the lock/cache without network access, and fail if cached bytes no longer match the recorded digest.

Private `github:` imports use existing GitHub credentials only during `--update-imports`: `GH_TOKEN`/`GITHUB_TOKEN` if set, otherwise the logged-in GitHub CLI (`gh auth token`). Tokens are never stored in the lockfile or cache. Commit `pluribus.lock.json`; treat `.pluribus/cache/remote/` as local, regenerable cache.

Output:
```
🔄 Syncing pluribus.md → claude, cursor, openclaw

   ✅ [claude]   → CLAUDE.md
   ✅ [cursor]   → .cursorrules
   ✅ [openclaw] → AGENTS.md

✅ Sync complete — 3 file(s) written.
```

**Preview without writing (dry run):**

```bash
pluribus sync --dry-run
```

**Sync specific tools only:**

```bash
pluribus sync --tools claude,openclaw
```

**Keep tool files fresh while editing:**

```bash
pluribus watch
```

`watch` monitors `pluribus.md`, debounces rapid editor saves, and re-runs `sync` automatically. It accepts the same `--source`, `--tools`, and `--update-imports` options as `sync`.

For scripts/hooks that should exit after the first detected change-triggered sync:

```bash
pluribus watch --once --tools claude,cursor
```

### Supported Tools

| Flag | Output file | AI Tool |
|---|---|---|
| `claude` | `CLAUDE.md` | Claude Code (Anthropic) |
| `cursor` | `.cursorrules` | Cursor AI editor |
| `openclaw` | `AGENTS.md` | OpenClaw agent runner |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot |
| `zed` | `.rules` | Zed Editor |
| `bob` | `.bob/rules/pluribus.md` | Bob rules |
| `windsurf` | `.windsurf/rules/pluribus.md` | Windsurf Cascade workspace rules |
| `continue` | `.continue/rules/pluribus.md` | Continue workspace rules |

### Custom Skills

Add a `pluribus/skills/<tool>.md` file to override or extend any built-in skill.
See `spec/skills-format.md` for the skill file format.

---

## Status

🚧 **Early development** — the spec and CLI are being built in public.

### Roadmap

- [x] Problem definition & vision
- [x] Context format spec (`pluribus.md` flat format)
- [x] Skills format spec (extensible adapter system)
- [x] CLI: `pluribus init` — scaffold your context
- [x] CLI: `pluribus sync` — generate tool-specific files
- [x] OpenClaw integration (built-in skill)
- [x] Cursor integration (built-in skill)
- [x] Copilot integration (built-in skill)
- [x] Claude Code integration (built-in skill)
- [x] Zed Editor integration (built-in skill)
- [x] Bob rules integration (built-in skill)
- [ ] Custom skill overrides (local `pluribus/skills/`)
- [x] Windsurf integration (built-in workspace rule)
- [x] Continue integration (built-in workspace rule)
- [x] `pluribus validate` command
- [x] `pluribus watch` command (debounced auto-sync on context changes)
- [x] Composable contexts MVP (local `# @import ./file.md`)
- [x] Remote composable contexts MVP (explicit `--update-imports`, public GitHub/HTTPS, safety limits)
- [x] Remote imports hardening (lockfile/cache/digest offline mode, optional GitHub auth, and CI coverage)
- [ ] CI/CD: auto-sync on commit
- [x] Published to npm as [`pluribus-context`](https://www.npmjs.com/package/pluribus-context)

## Building in Public

I'm documenting every step of building Pluribus — the decisions, the trade-offs, the mistakes.

Follow along: [@RibeiroCaioCLW](https://x.com/RibeiroCaioCLW)

If you've felt this pain, tell me about your setup. What tools do you use? How do you manage context today? What's broken?

- [Review/listing feedback](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=review-feedback.yml) — if Pluribus was hard to classify for a directory, awesome-list, newsletter, or package review
- [Quickstart feedback](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=quickstart-feedback.yml) — if install, validate, or dry-run felt confusing
- [Audit feedback](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=audit-feedback.yml) — if read-only `pluribus audit` missed drift, was noisy, or left the next step unclear
- [Bug report](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=bug-report.yml) — if a command failed or generated the wrong output
- [Tool integration request](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=integration-request.yml) — if another AI tool should be supported

## Docs

- [Quickstart](docs/quickstart.md) — first install, validation, dry-run preview, and common friction
- [Migrate Existing AI Context Files](docs/migrate-existing-context.md) — move from `CLAUDE.md`, `.cursorrules`, Copilot instructions, or `AGENTS.md` to one source of truth
- [When to use Pluribus](docs/when-to-use-pluribus.md) — choose between sync, one-way conversion, and tool-native context files
- [Context File Review Checklist](docs/context-file-review.md) — review AI instructions as supply-chain artifacts before committing generated context
- [OpenClaw Integration](docs/openclaw-integration.md) — how Pluribus generates `AGENTS.md` for OpenClaw
- [Composable Contexts](docs/composable-contexts.md) — local/remote imports, merge behavior, and safety rules
- [MCP Memory Handoff](docs/memory-mcp-handoff.md) — demo for keeping memory recall/store protocols aligned across tool-specific instruction files
- [Remote Composable Context Imports](docs/remote-composable-context-imports.md) — design notes for lockfile/cache/auth hardening
- [Context Format Spec](spec/context-format.md) — the `pluribus.md` format reference
- [Skills Format Spec](spec/skills-format.md) — how adapters work and how to write custom skills
- [Release Checklist](docs/release-checklist.md) — reproducible npm/GitHub release steps
- [Changelog](CHANGELOG.md) — user-facing release notes

---

## Contributing

This project is just getting started. The best way to help right now:

1. Try the 60-second smoke test above in a throwaway directory
2. ⭐ Star the repo if the problem resonates
3. 🗣️ [Open a quickstart feedback issue](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=quickstart-feedback.yml) if anything felt confusing
4. 🔎 [Open an audit feedback issue](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=audit-feedback.yml) if the read-only audit missed drift or felt noisy
5. 🧭 [Open a review/listing feedback issue](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=review-feedback.yml) if the category, listing copy, or safety/removability claims are unclear
6. 📣 Share with someone who maintains 3+ AI context files

Looking for first contributions? Check out the [open issues](https://github.com/caioribeiroclw-pixel/pluribus/issues). The next good contributions are CI/CD workflow examples, real-world adapter feedback, and install/quickstart friction reports.

## License

[MIT](LICENSE) — use it, fork it, build on it.

---

*"E pluribus unum" — out of many, one.*
