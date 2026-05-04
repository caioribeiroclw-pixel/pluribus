# Context Drift Audit

Use this before adopting Pluribus when you are not sure whether your AI context files have already drifted.

The goal is not to make every tool identical. The goal is to separate shared project facts from tool-specific behavior so the shared parts can live in `pluribus.md` and be regenerated deliberately.

## 1. Find AI context surfaces

From the project root:

```bash
find . -maxdepth 4 \( \
  -name 'CLAUDE.md' -o \
  -name '.cursorrules' -o \
  -path './.cursor/rules/*.mdc' -o \
  -path './.github/copilot-instructions.md' -o \
  -name 'AGENTS.md' -o \
  -path './.windsurf/rules/*.md' -o \
  -path './.continue/rules/*.md' -o \
  -name '.rules' \
\) -print
```

If this returns zero or one file, Pluribus may still be useful for future portability, but context drift is probably not your immediate pain.

## 2. Compare shared facts

For each file, scan for facts that should be identical everywhere:

- project purpose and product constraints;
- stack, runtime versions, package manager, and framework choices;
- test/lint/build commands;
- architecture boundaries and ownership rules;
- security or privacy constraints;
- review expectations and generated-file warnings.

Drift usually shows up as small contradictions: one file says Node 20, another says Node 22; one mentions Vitest, another mentions Jest; one has a security constraint the others never see.

## 3. Split shared context from tool-specific context

Move stable shared context into `pluribus.md`:

```markdown
# Identity
This repo is <project>. Its goal is <goal>.

# Stack
- Runtime: Node.js 22
- Package manager: npm
- Tests: npm test

# Conventions
- Prefer small focused changes.
- Run tests before publishing.

# Goals
- Keep AI tools aligned on the same project rules.

# Constraints
- Do not expose secrets, tokens, or private infrastructure details.
```

Keep tool-specific behavior outside the shared layer when it truly belongs to one tool: Cursor glob/frontmatter semantics, Claude-only slash-command notes, local MCP setup, or IDE-specific UI instructions.

## 4. Preview the regenerated files

Run a dry-run before writing anything:

```bash
npx pluribus-context validate
npx pluribus-context sync --dry-run
```

Read the previews and ask two questions:

1. Did every generated file receive the shared facts it needs?
2. Did anything tool-specific get flattened into a place where it does not belong?

If the answer to either question is no, edit `pluribus.md` or keep that behavior in a tool-native file before syncing.

## 5. Add a lightweight drift check

After adoption, the simplest check is to regenerate and fail if generated files changed unexpectedly:

```bash
npx pluribus-context sync
git diff --exit-code -- \
  CLAUDE.md \
  .cursorrules \
  .github/copilot-instructions.md \
  AGENTS.md \
  .windsurf/rules/pluribus.md \
  .continue/rules/pluribus.md \
  .rules
```

That catches two common failure modes:

- someone edited a generated file directly;
- someone changed `pluribus.md` but forgot to regenerate outputs.

## Decision rule

Adopt Pluribus if the audit finds repeated shared facts across two or more tools and at least one contradiction, stale command, or copy-paste maintenance burden.

Do not adopt it just to replace one healthy context file. A single accurate `CLAUDE.md` or `AGENTS.md` is better than an unnecessary abstraction.
