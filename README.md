# Pluribus

[![Building in Public](https://img.shields.io/badge/building-in%20public-orange?style=flat-square)](https://x.com/RibeiroCaioCLW)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

> Intentional context across every AI tool you use.

Pluribus keeps project instructions, conventions, constraints, and team context in one versioned source of truth, then syncs that context into the formats each AI tool expects.

It is **not** a persistent memory layer, retrieval system, agent orchestrator, or agent-merging framework. Think `CLAUDE.md`, `.cursorrules`, `copilot-instructions.md`, `AGENTS.md` — one intentional context, multiple generated outputs.

---

## The Problem

You use Claude, Copilot, Cursor, Windsurf, ChatGPT, and whatever ships next Tuesday.

Each one has its own way of understanding your project:
- `CLAUDE.md` for Claude Code
- `copilot-instructions.md` for GitHub Copilot
- `.cursorrules` for Cursor
- `AGENTS.md` for OpenClaw
- `.windsurfrules` for Windsurf

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
npx pluribus sync
```

And it generates the right files for each tool:
- `CLAUDE.md` ← for Claude Code
- `.github/copilot-instructions.md` ← for Copilot
- `.cursorrules` ← for Cursor
- `AGENTS.md` ← for OpenClaw
- `.windsurfrules` ← for Windsurf

**One source of truth. Zero drift.**

## Why `.md`?

- It's **human-readable** — you can review it, version it, PR it
- It's **universal** — every tool already parses markdown
- It's **composable** — import shared contexts across projects
- It's **versionable** — git diff your AI context like you diff your code
- It's **simple** — no YAML schemas, no JSON configs, no lock files

## Getting Started

### Install

```bash
# From npm (once published)
npm install -g pluribus

# Or run directly with npx
npx pluribus

# Or clone and link locally
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus
npm link
```

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

**4. Sync to all your tools**

```bash
pluribus sync
```

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

### Supported Tools

| Flag | Output file | AI Tool |
|---|---|---|
| `claude` | `CLAUDE.md` | Claude Code (Anthropic) |
| `cursor` | `.cursorrules` | Cursor AI editor |
| `openclaw` | `AGENTS.md` | OpenClaw agent runner |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot |
| `windsurf` | `.windsurfrules` | Windsurf AI editor _(coming soon)_ |

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
- [ ] Custom skill overrides (local `pluribus/skills/`)
- [ ] Windsurf integration
- [ ] `pluribus validate` command
- [x] Composable contexts MVP (local `# @import ./file.md`)
- [ ] Remote composable contexts (GitHub/URL imports with cache/auth rules)
- [ ] CI/CD: auto-sync on commit
- [ ] Published to npm

## Building in Public

I'm documenting every step of building Pluribus — the decisions, the trade-offs, the mistakes.

Follow along: [@RibeiroCaioCLW](https://x.com/RibeiroCaioCLW)

If you've felt this pain, [open an issue](https://github.com/caioribeiroclw-pixel/pluribus/issues) and tell me about your setup. What tools do you use? How do you manage context today? What's broken?

## Docs

- [OpenClaw Integration](docs/openclaw-integration.md) — how Pluribus generates `AGENTS.md` for OpenClaw
- [Composable Contexts](docs/composable-contexts.md) — local imports, merge behavior, and safety rules
- [Context Format Spec](spec/context-format.md) — the `pluribus.md` format reference
- [Skills Format Spec](spec/skills-format.md) — how adapters work and how to write custom skills

---

## Contributing

This project is just getting started. The best way to help right now:

1. ⭐ Star the repo if the problem resonates
2. 🗣️ [Open an issue](https://github.com/caioribeiroclw-pixel/pluribus/issues) describing your context management pain
3. 📣 Share with someone who maintains 3+ AI context files

Formal contributing guidelines coming soon.

## License

[MIT](LICENSE) — use it, fork it, build on it.

---

*"E pluribus unum" — out of many, one.*
