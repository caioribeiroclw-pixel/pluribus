# Context Drift Taxonomy

"Context drift" is overloaded. Different teams use the same phrase for different failure modes, so the fix depends on which layer is drifting.

Pluribus is intentionally focused on one layer: keeping generated AI context files aligned with an intentional source of truth. It can help you see and prevent file-level drift, but it cannot prove that a model will prioritize a correct file at runtime.

## 1. Output drift: generated files no longer match the source

**Symptom:** `pluribus.md` says one thing, but `CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, Windsurf, Continue, or Zed outputs are missing or stale.

**Common cause:** someone edited a generated file directly, changed the source without regenerating outputs, or forgot to commit a generated file.

**Best check:**

```bash
npx pluribus-context audit --strict
```

**Best fix:** regenerate outputs from the reviewed source:

```bash
npx pluribus-context sync --dry-run
npx pluribus-context sync
```

This is Pluribus' core job.

## 2. Source-of-truth drift: the canonical file is wrong

**Symptom:** all generated files match `pluribus.md`, but the shared instructions are outdated: stale test commands, dead paths, old architecture notes, or constraints that no longer match the codebase.

**Common cause:** the team treats AI context as documentation, but does not review it when code or process changes.

**Best check:** repo-specific review, tests, docs review, or a dedicated context linter that can detect dead paths, stale commands, token bloat, unsafe instructions, and conflicting guidance.

**Best fix:** update `pluribus.md` in the same PR as the code/process change, then run `pluribus audit --strict` after syncing.

Pluribus can make the canonical context reviewable, but it cannot know whether every statement is semantically true for your repo.

## 3. Runtime loading drift: the file exists, but the tool does not load or prioritize it

**Symptom:** `CLAUDE.md` or another generated file is correct on disk, but the model behaves as if older, summarized, or lower-priority instructions are more authoritative. This often appears after compaction, summarization, long sessions, or subagent handoffs.

**Common cause:** runtime load order, context-window ordering, summary precedence, missing diagnostics, or a tool-specific rule about when files are read.

**Best check:** tool-specific diagnostics, hooks, load traces, or a fresh-session sanity check:

1. Open a fresh session in the target tool.
2. Ask it to summarize the project rules or list the instruction files it loaded.
3. If available, inspect hook output or context-load traces.

A lightweight canary near the top of a generated file can show that the file was noticed, but it does not prove priority after compaction or summarization.

**Best fix:** tool-specific load-order or hook configuration. Pluribus can keep the file aligned; the tool must prove that it loaded and prioritized the file.

## 4. Behavioral drift: the model changes behavior across turns despite correct files

**Symptom:** the same instructions are loaded, but compliance degrades across long sessions or repeated tasks.

**Common cause:** accumulated conversation state, ambiguous instructions, too many soft preferences, or summaries that preserve the spirit of a rule while losing exact constraints.

**Best check:** reproduce in a fresh session versus a long/resumed session. If fresh sessions comply and long sessions drift, the issue is runtime/session behavior, not file sync.

**Best fix:** tighten critical rules into explicit constraints, split large instruction files, use tool-specific hooks where available, and keep hard requirements near the top of the runtime-loaded context.

## Decision table

| Drift type | Fastest check | Pluribus role |
|---|---|---|
| Generated files stale or missing | `pluribus audit --strict` | Core fit |
| Canonical context outdated | repo/context linter + review | Makes source reviewable, but does not validate truth |
| Correct file ignored after compaction | tool diagnostics/hooks/load trace | Boundary: Pluribus cannot control runtime priority |
| Long-session behavior degrades | fresh-session repro + runtime checks | Boundary: sync can help, but runtime must enforce priority |

## Practical adoption path

1. Run `npx pluribus-context audit` to learn which files exist and whether generated outputs are current.
2. If multiple tools share the same facts, move those stable facts into `pluribus.md`.
3. Run `npx pluribus-context sync --dry-run` and review the generated files.
4. Add `npx pluribus-context audit --strict` to CI or pre-commit if generated files should stay current.
5. Separately verify that each AI tool actually loads and prioritizes its generated file at runtime.

That separation keeps the promise honest: Pluribus prevents file-level context drift. It complements, rather than replaces, runtime diagnostics and context linters.
