# Contributing to Pluribus

Thanks for your interest in contributing. Pluribus is a small, focused tool; contributions should stay small and focused too.

---

## What Pluribus does

Pluribus syncs one intentional context file (`pluribus.md`) to the instruction formats used by different AI coding tools: `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `AGENTS.md`, Windsurf rules, Continue rules, Zed rules, Bob rules, and similar files.

Good contributions:
- Add or improve a tool adapter.
- Fix a bug in `init`, `validate`, `sync`, `watch`, or import resolution.
- Improve docs with real first-run examples.
- Add regression tests for behavior that surprised you.
- Report friction from trying the quickstart in a real project.

Out of scope for now:
- GUI / web app.
- Hosted cloud sync.
- Runtime telemetry or tracking.
- Agent orchestration, memory databases, or retrieval systems.

---

## Quick first-run feedback

If you are trying Pluribus as a user, the most useful contribution is a short friction report:

1. Run the [Quickstart](docs/quickstart.md) or the README smoke test.
2. Note the command that confused you or failed.
3. Open a [Quickstart feedback issue](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=quickstart-feedback.yml).

Even a small note like “I expected `sync --dry-run` to show X, but it showed Y” is useful.

## Review/listing feedback

If you are reviewing Pluribus for a directory, awesome-list, newsletter, package roundup, or tool catalog, use the [Community Review Packet](docs/community-review-packet.md) for listing copy, category boundaries, safety/removability notes, and a disposable 60-second smoke test.

Open a [Review/listing feedback issue](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=review-feedback.yml) when the category, listing copy, metadata, install step, or safety claim slows review. Short notes are useful even if you did not run the CLI.

## Audit feedback

If your repo already has `CLAUDE.md`, Cursor rules, Copilot instructions, `AGENTS.md`, Windsurf rules, Continue rules, Zed rules, Bob rules, or other AI context files, the most useful report is often a read-only audit result:

```bash
npx --yes pluribus-context@latest audit
```

Open an [Audit feedback issue](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=audit-feedback.yml) when the audit misses drift, reports noisy drift, or leaves the next step unclear. Summaries are enough; do not paste secrets, private code, credentials, customer data, or internal instructions that should not be public.

---

## Local development

```bash
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus
npm install
npm test
npm run release:smoke
```

Useful checks before opening a PR:

```bash
npm test
git diff --check
npm pack --dry-run
```

---

## Project structure

```text
pluribus/
├── bin/
│   └── pluribus.js                  # CLI entrypoint
├── src/
│   ├── commands/                    # init / validate / sync / watch
│   ├── skills/                      # built-in tool adapters
│   └── utils/                       # imports, rendering, version helpers
├── docs/                            # quickstart and feature docs
├── examples/                        # runnable examples
├── spec/                            # context format spec
├── test/                            # node:test suite
├── scripts/
│   └── release-smoke.js             # tarball install smoke test
└── README.md
```

---

## Adding or changing a tool adapter

Current built-in adapter ids are:

| Tool id | Generated file |
| --- | --- |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursorrules` |
| `copilot` | `.github/copilot-instructions.md` |
| `openclaw` | `AGENTS.md` |
| `windsurf` | `.windsurf/rules/pluribus.md` |
| `continue` | `.continue/rules/pluribus.md` |
| `zed` | `.rules` |
| `bob` | `.bob/rules/pluribus.md` |
| `warp` | `WARP.md` |

If your tool is missing, open a [tool integration request](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=integration-request.yml) with the official docs URL, expected output path, and a minimal public example.

Tool adapters are registered in `src/skills/built-in.js`. Each adapter defines:

- the generated output file path;
- which Pluribus sections it uses;
- any tool-specific formatting requirements.

Before opening a PR:

1. Link to the official instruction-file docs for that tool, if available.
2. Add or update tests that prove the generated file path/content.
3. Update the supported-tool tables in `README.md`, `docs/quickstart.md`, and this contributor guide.
4. If the format is still unstable, prefer opening an issue first and mark it `future`.

---

## Issues

Before opening an issue:
- Search existing issues first.
- For bugs, include the exact command, Node.js version, package version, and minimal `pluribus.md`.
- For integration requests, include the tool name, official docs link, expected output path, and an example file.
- For quickstart friction, use the quickstart feedback template and keep it concrete.

Labels used in this repo:
- `bug` — something broken.
- `documentation` — docs/examples/quickstart clarity.
- `enhancement` — new capability or integration.
- `good first issue` — approachable without deep project context.
- `help wanted` — needs input from users of a specific tool/workflow.
- `question` — workflow or design question.
- `future` — radar item, not ready to implement.

---

## Pull requests

- One PR per change; do not bundle unrelated fixes.
- Use clear commit prefixes (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Keep dependencies minimal; Pluribus intentionally has no runtime dependency stack.
- If you add behavior, add tests.
- If you change release/package behavior, run `npm run release:smoke`.

PR description template:

```markdown
## What
Brief description of the change.

## Why
What problem does this solve?

## How
How did you implement it?

## Testing
- [ ] npm test
- [ ] git diff --check
- [ ] npm run release:smoke (if package/CLI behavior changed)
```

---

## First-time contributors

New to open source? Check issues labeled [`good first issue`](https://github.com/caioribeiroclw-pixel/pluribus/labels/good%20first%20issue). If none are open, a quickstart feedback report is still valuable and much easier than writing code.

If you get stuck, open a draft PR or issue and ask. The best reports are concrete, small, and reproducible.

---

## Code style

- Node.js with native ES modules.
- `node:test` for tests.
- No unnecessary dependencies.
- Prefer explicit behavior over clever abstractions.
- Keep user-facing CLI output stable unless the change is intentional.

---

Built by [@RibeiroCaioCLW](https://x.com/RibeiroCaioCLW).
