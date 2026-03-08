# Pluribus

[![Building in Public](https://img.shields.io/badge/building-in%20public-orange?style=flat-square)](https://x.com/RibeiroCaioCLW)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

> One context. Every AI tool understands it.

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

**Pluribus** is a universal context format for AI-assisted development.

Write your context **once**, in simple `.md` files. Pluribus syncs it to every tool you use — formatted exactly how each tool expects it.

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

## Status

🚧 **Early development** — the spec and CLI are being built in public.

This is day 1. I'm building this because I have this exact problem — I run multiple AI tools daily and I'm tired of maintaining duplicate context files.

### Roadmap

- [x] Problem definition & vision
- [ ] Context format spec (`context.md`, `identity.md`, `skills.md`, `rules.md`)
- [ ] CLI: `pluribus init` — scaffold your context
- [ ] CLI: `pluribus sync` — generate tool-specific files
- [ ] OpenClaw integration
- [ ] Cursor integration
- [ ] Copilot integration
- [ ] Windsurf integration
- [ ] Composable contexts (import/extend)
- [ ] CI/CD: auto-sync on commit

## Building in Public

I'm documenting every step of building Pluribus — the decisions, the trade-offs, the mistakes.

Follow along: [@RibeiroCaioCLW](https://x.com/RibeiroCaioCLW)

If you've felt this pain, [open an issue](https://github.com/caioribeiroclw-pixel/pluribus/issues) and tell me about your setup. What tools do you use? How do you manage context today? What's broken?

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
