# Contributing to Pluribus

Thanks for your interest in contributing! Pluribus is a small, focused tool â€” contributions should stay small and focused too.

---

## Philosophy

Pluribus does one thing: sync a single `pluribus.md` to the context formats used by different AI coding tools (CLAUDE.md, .cursorrules, copilot-instructions, etc.).

Good contributions:
- Add a new integration adapter (e.g., a new tool format)
- Fix a bug in an existing adapter
- Improve documentation with real usage examples
- Add tests for untested behavior

Out of scope (for now):
- GUI / web app
- Cloud sync / auth
- Anything requiring network access at runtime

---

## Getting Started

```bash
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus
npm install
npm test
```

---

## Project Structure

```
pluribus/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ cli.js          # CLI entry point (pluribus init / sync / watch)
â”‚   â”œâ”€â”€ sync.js         # Core sync logic
â”‚   â””â”€â”€ adapters/       # One file per tool integration
â”‚       â”œâ”€â”€ claude.js
â”‚       â”œâ”€â”€ cursor.js   # (planned)
â”‚       â””â”€â”€ copilot.js  # (planned)
â”œâ”€â”€ spec/
â”‚   â”œâ”€â”€ context-format.md   # pluribus.md format spec
â”‚   â””â”€â”€ skills-format.md    # skills section spec
â”œâ”€â”€ examples/
â”‚   â””â”€â”€ openclaw/
â”‚       â””â”€â”€ pluribus.md     # Real-world example
â”œâ”€â”€ test/
â””â”€â”€ README.md
```

---

## Adding an Integration Adapter

Each adapter lives in `src/adapters/` and exports a single function:

```js
// src/adapters/cursor.js
module.exports = function syncCursor(context, projectRoot) {
  // context: parsed pluribus.md sections
  // projectRoot: absolute path to project root
  // Returns: { path, content } to write
};
```

Steps to add a new adapter:
1. Create `src/adapters/<toolname>.js`
2. Register it in `src/sync.js`
3. Add a test in `test/adapters/<toolname>.test.js`
4. Document the format in the PR description (link to official docs if available)
5. Add the tool to the "Supported Formats" table in README.md

---

## Issues

Before opening an issue:
- Search existing issues first
- If it's a new integration request, include: tool name, format spec link, example file

Use labels:
- `enhancement` â€” new feature or integration
- `bug` â€” something broken
- `good first issue` â€” good entry point for new contributors
- `help wanted` â€” needs input from users of that specific tool

---

## Pull Requests

- One PR per change (don't bundle unrelated fixes)
- Keep commits clean (`feat:`, `fix:`, `docs:` prefixes)
- All tests must pass (`npm test`)
- If you add code, add tests

PR description template:
```
## What
Brief description of the change.

## Why
What problem does this solve?

## How
How did you implement it?

## Testing
How did you test it?
```

---

## First-time contributors

New to open source? Check the issues labeled [`good first issue`](https://github.com/caioribeiroclw-pixel/pluribus/labels/good%20first%20issue) â€” they're designed to be approachable without deep context.

If you get stuck, open a draft PR and ask. Happy to help.

---

## Code Style

- Node.js (no TypeScript for now â€” keeps the barrier low)
- CommonJS (`require` / `module.exports`)
- No unnecessary dependencies
- Prefer explicit over clever

---

Built with â˜ï¸ by [@RibeiroCaioCLW](https://x.com/RibeiroCaioCLW)
