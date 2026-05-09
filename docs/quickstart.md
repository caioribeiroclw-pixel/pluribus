# Quickstart

Use this when you want to try Pluribus without touching a real project yet.

Pluribus takes one intentional context file (`pluribus.md`) and generates the tool-specific files your AI tools expect: `CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, Windsurf/Continue rules, and Zed `.rules`.

Already have one or more of those files? Start with a read-only inventory before replacing anything:

```bash
npx --yes pluribus-context audit
```

Without `pluribus.md`, audit lists existing AI context surfaces so you can decide what to migrate. Then see [Migrate Existing AI Context Files](migrate-existing-context.md).

## 1. Create a disposable demo project

```bash
mkdir pluribus-demo
cd pluribus-demo
```

## 2. Scaffold context from npm

```bash
npx --yes pluribus-context init \
  --name "Ana" \
  --description "A Node.js service" \
  --tools claude,cursor,copilot
```

This creates `pluribus.md`, the single source-of-truth file Pluribus reads. Open it and replace the scaffolded notes with real project context when you are ready. If you later need team/org reuse, keep the local project sections in `pluribus.md` and import shared Markdown with `# @import ./shared/team-context.md`.

## 3. Validate before writing generated files

```bash
npx --yes pluribus-context validate
```

Validation checks for missing required sections, duplicate top-level sections, broken imports, and unsupported tool names.

## 4. Preview generated outputs

```bash
npx --yes pluribus-context sync --dry-run
```

You should see previews for the selected tools. For the command above, Pluribus targets:

| Tool | Generated file |
| --- | --- |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

## 5. Audit before writing or in CI

```bash
npx --yes pluribus-context audit
```

Before generated files exist, audit reports them as missing. After sync, it becomes a read-only drift check. Use `--strict` in CI when you want missing or drifted generated files to fail the build.

## 6. Write the files when the preview looks right

```bash
npx --yes pluribus-context sync
```

Commit `pluribus.md` as the source of truth. Commit generated files if your team wants each tool to work immediately after clone; otherwise regenerate them in local setup/CI.

## 7. Keep files fresh while editing

```bash
npx --yes pluribus-context watch
```

`watch` re-runs `sync` after edits to `pluribus.md` with a small debounce, so tool-specific files do not drift during normal work.

## Using shared or org-level context

For reusable team conventions, import shared Markdown before local project sections:

```markdown
# @import ./shared/team-context.md
# @import ./shared/security-constraints.md

# Identity
I am Ana, building Conduit — a Node.js job runner.
```

Local sections apply after imports, so project-specific context can override shared context. See [Composable Contexts](composable-contexts.md) for local and remote import details.

## Common friction

- **`pluribus` command not found after `npx`:** use `npx --yes pluribus-context ...` for one-off runs, or install globally with `npm install -g pluribus-context` and then run `pluribus ...`.
- **Remote imports fail without `--update-imports`:** network refresh is explicit. Run `npx --yes pluribus-context sync --update-imports` to refresh and pin remote content, then normal `sync` uses the lock/cache offline.
- **Private GitHub imports fail:** set `GH_TOKEN`/`GITHUB_TOKEN` or log in with `gh auth login`. Pluribus never writes tokens to `pluribus.lock.json` or cache files.
- **Generated files look wrong:** edit `pluribus.md`, run `validate`, then use `audit` and `sync --dry-run` before writing files.

## Feedback wanted

If the quickstart fails or the generated files do not match how your team actually uses AI tools, open an issue with:

1. the command you ran;
2. which tool file felt wrong;
3. what you expected Pluribus to generate instead.

That feedback is more useful than generic feature requests because it shows where the context format or adapters are not matching real workflows.
