# When to use Pluribus

Pluribus is for keeping intentional AI context in sync across tools.

Use it when you already have, or expect to have, more than one context surface for the same project:

- `CLAUDE.md` for Claude Code
- `.cursorrules` or `.cursor/rules/*.mdc` for Cursor
- `.github/copilot-instructions.md` for GitHub Copilot
- `AGENTS.md` for OpenClaw or Codex-style agents
- Windsurf, Continue, Zed, or other workspace rule files

The core bet is simple: if multiple AI tools need the same project facts, conventions, and constraints, those facts should be reviewed once and generated many times.

## Use Pluribus if

- You use two or more AI coding tools in the same repo.
- You maintain project conventions by copy-pasting between context files.
- You want context changes to be visible in git review.
- You want a dry-run before overwriting generated tool files.
- Your team has shared conventions that should apply across many repos.
- You want remote/shared context pinned with a lockfile before syncing.

## You may not need it if

- You only use one AI tool and one context file.
- Your context is entirely tool-specific and should not be shared.
- You need chat memory, retrieval, vector search, or agent orchestration.
- You want a one-time migration and do not plan to keep files synchronized.

## Pluribus vs one-way converters

A one-way converter is useful when you want to translate one tool's rule format into another tool's file once.

Pluribus is different: it treats `pluribus.md` as the source of truth and regenerates the tool files from that source whenever the context changes.

| Need | Better fit |
|---|---|
| Convert existing Cursor rules into `CLAUDE.md` once | One-way converter |
| Keep Claude, Cursor, Copilot, OpenClaw, Windsurf, Continue, and Zed context aligned over time | Pluribus |
| Preserve tool-specific metadata exactly as-is | Tool-native files or a converter |
| Review shared project context in PRs and regenerate generated files | Pluribus |
| Share org/team conventions across repos with pinned imports | Pluribus |

## Recommended migration path

1. Inventory your existing context files.
2. Move shared project facts and conventions into `pluribus.md`.
3. Keep genuinely tool-specific behavior in tool-native files or custom skills.
4. Run `pluribus sync --dry-run` and inspect the output.
5. Commit `pluribus.md`, generated files, and `pluribus.lock.json` if remote imports are used.

For the step-by-step version, see [Migrate Existing AI Context Files](migrate-existing-context.md).

## Mental model

Pluribus is not trying to make every AI tool identical.

It is trying to keep the stable, intentional parts of your project context from drifting while still letting each tool keep its own interface and strengths.
