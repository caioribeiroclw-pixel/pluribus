# Pluribus

[![npm version](https://img.shields.io/npm/v/pluribus-context?style=flat-square)](https://www.npmjs.com/package/pluribus-context)
[![Building in Public](https://img.shields.io/badge/building-in%20public-orange?style=flat-square)](https://x.com/RibeiroCaioCLW)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

> Intentional context across every AI tool you use.

Pluribus keeps project instructions, conventions, constraints, and team context in one versioned source of truth, then syncs that context into the formats each AI tool expects.

It is **not** a persistent memory layer, retrieval system, agent orchestrator, or agent-merging framework. Think `CLAUDE.md`, `.cursorrules`, `copilot-instructions.md`, `AGENTS.md` — one intentional context, multiple generated outputs.

---

## The Problem

You use Claude, Copilot, Cursor, Windsurf, Continue, Zed, ChatGPT, and whatever ships next Tuesday.

Each one has its own way of understanding your project:
- `CLAUDE.md` for Claude Code
- `copilot-instructions.md` for GitHub Copilot
- `.cursorrules` for Cursor
- `AGENTS.md` for OpenClaw
- `.windsurf/rules/pluribus.md` for Windsurf Cascade
- `.continue/rules/pluribus.md` for Continue
- `.rules` for Zed

You end up maintaining **5+ files** that say roughly the same thing — your project's architecture, conventions, tech stack, who you are, what matters. Copy-paste across files. They drift. They rot. You forget to update one. Your AI gives you wrong answers because it's reading stale context.

**This is a multiplying problem.** Every new AI tool = another context file = more maintenance = more drift.

## The Vision

**Pluribus** is a universal format for intentional context in AI-assisted development.

Write your project context **once**, in simple `.md` files. Pluribus syncs it to every tool you use — formatted exactly how each tool expects it.

```
pluribus/
├── context.md        # Your project: stack, architecture, conventions
├── identity.md       # Who you are, your preferences, tone
├── skills.md         # What your AI should be good at
└── rules.md          # Guardrails and constraints
```

Then:

```bash
npx pluribus-context sync
```

And it generates the right files for each tool:
- `CLAUDE.md` ← for Claude Code
- `.github/copilot-instructions.md` ← for Copilot
- `.cursorrules` ← for Cursor
- `AGENTS.md` ← for OpenClaw
- `.windsurf/rules/pluribus.md` ← for Windsurf Cascade
- `.continue/rules/pluribus.md` ← for Continue
- `.rules` ← for Zed

**One source of truth. Zero drift.**

## Why `.md`?

- It's **human-readable** — you can review it, version it, PR it
- It's **universal** — every tool already parses markdown
- It's **composable** — import shared contexts across projects
- It's **versionable** — git diff your AI context like you diff your code
- It's **simple** — no YAML schemas, minimal JSON only when you opt into locked remote imports

## Getting Started

### Install

```bash
# Run directly from npm
npx pluribus-context init

# Or install globally
npm install -g pluribus-context
pluribus --help

# Or clone and link locally
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus
npm link
```

### 60-second smoke test

Want to see exactly what gets generated before adding it to a real project?

```bash
mkdir pluribus-demo && cd pluribus-demo
npx pluribus-context init --name "Ana" --description "A Node.js service" --tools claude,cursor,copilot
npx pluribus-context validate
npx pluribus-context sync --dry-run
```

If the preview looks right, run `npx pluribus-context sync` to write the tool-specific files.

For a fuller walkthrough, see the [Quickstart](docs/quickstart.md). To enforce generated context files in pull requests, use the [CI audit example](docs/ci-audit-example.md). If your repo already has `CLAUDE.md`, `.cursorrules`, Copilot instructions, or `AGENTS.md`, run a [Context Drift Audit](docs/context-drift-audit.md) first, then follow [Migrate Existing AI Context Files](docs/migrate-existing-context.md). Before committing shared or generated AI instructions, use the [Context File Review Checklist](docs/context-file-review.md). If you're deciding between Pluribus and a one-way rules converter, see [When to use Pluribus](docs/when-to-use-pluribus.md). If you are debugging "context drift" after compaction or long sessions, start with the [Context Drift Taxonomy](docs/context-drift-taxonomy.md) to separate file drift from runtime precedence drift.

### Usage

**1. Initialize your context file**

```bash
cd your-project/
pluribus init
```

This creates `pluribus.md` with all required sections scaffolded. Fill in your project context.

You can also use flags for non-interactive init:

```bash
pluribus init --name "Ana" --description "A background job runner" --tools claude,cursor,openclaw
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
pluribus audit --strict --github-annotations
```

For CI scripts, dashboards, or migration tooling, use machine-readable output:

```bash
pluribus audit --strict --json
```

For a copy-paste workflow file, see the [CI audit example](docs/ci-audit-example.md).

If your project does not have `pluribus.md` yet, `pluribus audit` scans for known AI context files (`CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, Windsurf, Continue, Zed) so you know what to migrate.

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

- [Quickstart feedback](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=quickstart-feedback.yml) — if install, validate, or dry-run felt confusing
- [Bug report](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=bug-report.yml) — if a command failed or generated the wrong output
- [Tool integration request](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=integration-request.yml) — if another AI tool should be supported

## Docs

- [Quickstart](docs/quickstart.md) — first install, validation, dry-run preview, and common friction
- [Migrate Existing AI Context Files](docs/migrate-existing-context.md) — move from `CLAUDE.md`, `.cursorrules`, Copilot instructions, or `AGENTS.md` to one source of truth
- [When to use Pluribus](docs/when-to-use-pluribus.md) — choose between sync, one-way conversion, and tool-native context files
- [Context File Review Checklist](docs/context-file-review.md) — review AI instructions as supply-chain artifacts before committing generated context
- [OpenClaw Integration](docs/openclaw-integration.md) — how Pluribus generates `AGENTS.md` for OpenClaw
- [Composable Contexts](docs/composable-contexts.md) — local/remote imports, merge behavior, and safety rules
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
4. 📣 Share with someone who maintains 3+ AI context files

Looking for first contributions? Check out the [open issues](https://github.com/caioribeiroclw-pixel/pluribus/issues). The next good contributions are CI/CD workflow examples, real-world adapter feedback, and install/quickstart friction reports.

## License

[MIT](LICENSE) — use it, fork it, build on it.

---

*"E pluribus unum" — out of many, one.*
