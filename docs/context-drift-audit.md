# Context Drift Audit

Use this before adopting Pluribus when you are not sure whether your AI context files have already drifted.

The goal is not to make every tool identical. The goal is to separate shared project facts from tool-specific behavior so the shared parts can live in `pluribus.md` and be regenerated deliberately.

If you are using "drift" to mean compaction, summarization, load-order, or long-session behavior, read the [Context Drift Taxonomy](context-drift-taxonomy.md) first. Pluribus audits file-level output drift; runtime precedence drift needs tool-specific diagnostics too.

Start with the read-only command when you want a quick signal:

```bash
npx pluribus-context audit
```

If `pluribus.md` exists, this reports generated files that are current, missing, or drifted. If `pluribus.md` does not exist yet, it scans for known AI context files so you can decide what to migrate.

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

## 4. Audit and preview the regenerated files

Run the read-only audit first:

```bash
npx pluribus-context audit
```

If `pluribus.md` exists, this compares generated tool files with the source and reports anything missing or drifted. If `pluribus.md` does not exist yet, it scans for known AI context files so you know what to migrate.

Then run a dry-run before writing anything:

```bash
npx pluribus-context validate
npx pluribus-context sync --dry-run
```

Read the previews and ask two questions:

1. Did every generated file receive the shared facts it needs?
2. Did anything tool-specific get flattened into a place where it does not belong?

If the answer to either question is no, edit `pluribus.md` or keep that behavior in a tool-native file before syncing.

## 5. Add a lightweight drift check

After adoption, the simplest check is:

```bash
npx pluribus-context audit --strict
```

If you want GitHub Actions to show drift inline in the check UI, add `--github-annotations`:

```bash
npx pluribus-context audit --strict --github-annotations
```

If you want machine-readable results for CI, dashboards, or a migration script, add `--json`:

```bash
npx pluribus-context audit --strict --json
```

The JSON output includes `ok`, `source`, `results`, `summary`, and `nextStep`, so callers can fail on drift without parsing the human emoji output. `--github-annotations` writes annotations to stderr, so it can be combined with `--json` while keeping stdout parseable. See the [CI audit example](ci-audit-example.md) for a copy-paste GitHub Actions workflow and JSON artifact variant.

That catches three common failure modes without writing files:

- someone edited a generated file directly;
- someone changed `pluribus.md` but forgot to regenerate outputs;
- a configured output file is missing.

Use `sync --dry-run` to inspect the fix, then `sync` to update generated files.

## What this does not check

`pluribus audit` is intentionally narrow: it checks whether the files generated from `pluribus.md` are current, missing, or drifted. It is not a general-purpose linter for whether your instructions still match the repository, and it cannot prove how a specific AI tool prioritizes those instructions at runtime.

That distinction matters:

- use `pluribus audit` when you want to know whether `CLAUDE.md`, Cursor rules, Copilot instructions, `AGENTS.md`, Windsurf, Continue, or Zed outputs are still in sync with the same source of truth;
- use repo-specific checks, tests, or AI-context linters when you want to find stale commands, dead paths, outdated architecture notes, or conflicting nested instruction files;
- use tool-specific diagnostics or hooks when the file is correct but the model drifts after compaction, summarization, or context-window reordering;
- use both if your risk is bigger than copy-paste drift: first keep generated files aligned, then validate that the shared instructions are still true and loaded with the right precedence.

Pluribus solves output drift across tools. It does not prove that the canonical context is correct or that every tool will give the generated file the same runtime priority. For a fuller split between output drift, source-of-truth drift, runtime loading drift, and behavioral drift, see the [Context Drift Taxonomy](context-drift-taxonomy.md).

## Verify runtime loading separately

After `pluribus sync`, do one tool-specific sanity check before trusting a new workflow:

1. Open a fresh session in the tool you care about.
2. Ask it to summarize the project rules or list the files it loaded.
3. If the tool supports hooks, diagnostics, or load traces, check those too.

Some teams add a short loading canary near the top of their generated context, for example: "Before acting, confirm that you read the project AI instructions." Keep this lightweight. A canary can prove the file was noticed, but it does not prove every instruction will keep priority after compaction, summarization, or a long session.

Use Pluribus to keep the files aligned. Use the tool's own diagnostics to confirm the runtime actually loaded and prioritized them.

## Decision rule

Adopt Pluribus if the audit finds repeated shared facts across two or more tools and at least one contradiction, stale command, or copy-paste maintenance burden.

Do not adopt it just to replace one healthy context file. A single accurate `CLAUDE.md` or `AGENTS.md` is better than an unnecessary abstraction.
