# Migrate Existing AI Context Files

Use this guide when your project already has one or more AI instruction files and you want Pluribus to become the source of truth without losing working context.

Typical starting point:

```text
CLAUDE.md
.cursorrules
.github/copilot-instructions.md
AGENTS.md
.windsurf/rules/pluribus.md
.continue/rules/pluribus.md
.rules
```

Goal:

```text
pluribus.md                 # edit this
CLAUDE.md                   # generated
.cursorrules                # generated
.github/copilot-instructions.md
AGENTS.md
...
```

## 1. Inventory what exists

From the project root:

```bash
find . -maxdepth 3 \( \
  -name 'CLAUDE.md' -o \
  -name '.cursorrules' -o \
  -path './.github/copilot-instructions.md' -o \
  -name 'AGENTS.md' -o \
  -path './.windsurf/rules/pluribus.md' -o \
  -path './.continue/rules/pluribus.md' -o \
  -name '.rules' \
\) -print
```

Read the files and separate three kinds of content:

1. **Project facts** — stack, architecture, commands, deployment model.
2. **Conventions** — style, testing expectations, review rules, naming patterns.
3. **Tool-specific quirks** — instructions that only make sense for one tool.

Move project facts and shared conventions into `pluribus.md`. Keep tool-specific quirks as adapter feedback or custom skill work, not as duplicated generic context.

## 2. Preview and scaffold `pluribus.md`

Preview the scaffold before writing a new source file. `init --dry-run` is prepared for `pluribus-context@0.3.3`; until that patch is published, use the GitHub tag install command for the preview:

```bash
npx --yes --package github:caioribeiroclw-pixel/pluribus#v0.3.3 pluribus init --dry-run \
  --name "Your project" \
  --description "What this repo does" \
  --tools claude,cursor,copilot,openclaw
```

When the preview looks right, create `pluribus.md` from the published npm package:

```bash
npx --yes pluribus-context@latest init \
  --name "Your project" \
  --description "What this repo does" \
  --tools claude,cursor,copilot,openclaw
```

Edit `pluribus.md` and paste the shared context into the scaffolded sections.

A practical first pass:

```markdown
# Identity
I am working on <project>. The goal is <goal>.

# Stack
- Runtime: Node.js 22
- Language: TypeScript
- Test command: npm test

# Conventions
- Prefer small focused changes.
- Add tests for behavior changes.
- Keep generated files out of manual edits.

# Goals
- Keep AI tools aligned on the same project rules.

# Constraints
- Do not introduce new production dependencies without a clear reason.
- Do not expose secrets, tokens, or private infrastructure details.
```

## 3. Preview before overwriting anything

Run a dry-run first:

```bash
npx --yes pluribus-context@latest validate
npx --yes pluribus-context@latest sync --dry-run
```

Check the preview for each target tool. If the generated files would lose important instructions, move that missing context into `pluribus.md` and run the dry-run again.

## 4. Replace generated files deliberately

When the preview looks right:

```bash
npx --yes pluribus-context@latest sync
```

Review the diff carefully:

```bash
git diff -- CLAUDE.md .cursorrules .github/copilot-instructions.md AGENTS.md
```

Recommended commit shape:

1. Commit `pluribus.md` and generated files together.
2. In the commit message, say that generated AI context files now come from Pluribus.
3. Tell teammates to edit `pluribus.md`, not the generated outputs.

## 5. Add a guardrail for drift

For local work:

```bash
npx --yes pluribus-context@latest watch
```

For CI or pre-commit flows, use the read-only audit command in strict mode:

```bash
npx --yes pluribus-context@latest audit --strict
```

If this fails, someone edited a generated file directly or changed `pluribus.md` without regenerating outputs. Use `npx --yes pluribus-context@latest sync --dry-run` to preview the fix before writing files.

## 6. Use imports for team/org context

If several repos share the same conventions, keep shared context in one file and import it:

```markdown
# @import ./shared/team-context.md
# @import ./shared/security-constraints.md

# Identity
This repo is the billing service.
```

For cross-repo shared context, use explicit remote imports and pin them with `--update-imports`:

```markdown
# @import github:your-org/ai-context/shared/team-context.md@main
```

Then:

```bash
npx --yes pluribus-context@latest sync --update-imports
```

Commit `pluribus.lock.json` so future syncs are deterministic. Do not commit `.pluribus/cache/remote/`; it is a local regenerable cache.

## Migration checklist

- [ ] Existing AI context files inventoried.
- [ ] Shared project facts and conventions moved into `pluribus.md`.
- [ ] `validate` passes.
- [ ] `sync --dry-run` preview reviewed.
- [ ] Generated files written and reviewed with `git diff`.
- [ ] Team knows to edit `pluribus.md`, not generated outputs.
- [ ] Optional drift check added to CI/pre-commit.

## Feedback wanted

If migration from an existing `CLAUDE.md`, `.cursorrules`, or Copilot instructions file loses important semantics, open a [quickstart feedback issue](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=quickstart-feedback.yml) with:

1. which source file you migrated from;
2. which generated target felt wrong;
3. the smallest sanitized example of the missing instruction.

That is the fastest path to improving the adapters.
