# Community review packet

Use this when reviewing Pluribus for a list, newsletter, package roundup, or tool directory. It is written to be copy-pasteable without requiring private project context.

## One-line description

Pluribus keeps intentional AI coding context in one `pluribus.md` source of truth, then syncs or audits the tool-specific files used by Claude Code, Cursor, Copilot, OpenClaw, Windsurf, Continue, Zed, and Bob.

## Short listing copy

Pluribus is an open-source CLI for teams and solo developers who use multiple AI coding tools. It treats project instructions, conventions, constraints, and shared team context as versioned Markdown, then generates each tool's expected context file (`CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, Windsurf/Continue rules, Zed rules, and Bob rules). The safest first command is a read-only audit:

```bash
npx --yes pluribus-context@latest audit
```

## Directory submission fields

Use these fields for directories, awesome lists, or review forms that ask for a concise tool entry. Prefer this over inventing new copy per channel.

| Field | Copy |
| --- | --- |
| Name | Pluribus |
| URL | https://github.com/caioribeiroclw-pixel/pluribus |
| npm | https://www.npmjs.com/package/pluribus-context |
| License | MIT |
| Install / run | `npx --yes pluribus-context@latest audit` or `npm install -g pluribus-context@latest` |
| Category | AI coding tools / context management |
| Tags | `claude-code`, `cursor`, `copilot`, `openclaw`, `windsurf`, `continue`, `zed`, `bob`, `context-drift` |
| One sentence | Keep one versioned AI coding context in `pluribus.md`, then audit or sync the generated files used by Claude Code, Cursor, Copilot, OpenClaw, Windsurf, Continue, Zed, and Bob. |
| 280-char blurb | Pluribus is an open-source CLI for intentional AI coding context. It keeps project guidance in one `pluribus.md`, then audits or syncs `CLAUDE.md`, Cursor rules, Copilot instructions, `AGENTS.md`, Windsurf/Continue rules, Zed rules, and Bob rules. |
| Safe first command | `npx --yes pluribus-context@latest audit` |

### Awesome-list Markdown entry

Use this exact line when a curated list accepts one Markdown bullet per tool:

```markdown
- [Pluribus](https://github.com/caioribeiroclw-pixel/pluribus) - Open-source CLI that keeps one versioned AI coding context in sync across Claude Code, Cursor, Copilot, OpenClaw, Windsurf, Continue, Zed, and Bob.
```

## Why it may be useful

- Reduces copy-paste drift between AI tool instruction files.
- Lets users preview generated files with `sync --dry-run` before writing anything.
- Supports composable local context and explicit remote imports for shared team/org guidance.
- Provides CI/pre-commit audit paths so generated context drift is visible in code review.

## Fit and boundaries

Use this section when a directory, list maintainer, or reviewer asks how Pluribus differs from adjacent rules-sync or prompt-file tools.

| Question | Short answer |
| --- | --- |
| What category is it? | AI coding context management / rules sync CLI. |
| What is the source of truth? | `pluribus.md`, reviewed in git. |
| What does it generate? | Tool-native context files for Claude Code, Cursor, Copilot, OpenClaw, Windsurf, Continue, Zed, and Bob. |
| What is the safe first step? | Run `npx --yes pluribus-context@latest audit` to inspect existing context files without writing. |
| When is another tool enough? | If you only need one tool's native rules format or a one-time converter, a smaller rules manager/converter may be enough. |
| What is Pluribus not? | Not chat memory, retrieval, vector search, agent orchestration, or agent merging. |

## Safety and removability

- `audit`, `validate`, and `sync --dry-run` are read-only.
- `init` writes only `pluribus.md` and refuses to overwrite an existing file.
- `sync` writes only generated AI context files for the selected tools.
- Normal `audit`, `validate`, `sync`, and `sync --dry-run` runs do not make network requests.
- Remote imports fetch only when the user explicitly passes `--update-imports`; fetched content is pinned in `pluribus.lock.json` and cached under `.pluribus/cache/remote/`.
- A global install can be removed with `npm uninstall -g pluribus-context`; one-off `npx --yes pluribus-context@latest ...` does not create a persistent global `pluribus` command.

## 60-second review smoke

Run this in a disposable directory:

```bash
mkdir pluribus-review && cd pluribus-review
npx --yes pluribus-context@latest --version
npx --yes pluribus-context@latest init --dry-run --name "Review" --description "Disposable review project" --tools claude,cursor,copilot
npx --yes pluribus-context@latest init --name "Review" --description "Disposable review project" --tools claude,cursor,copilot
npx --yes pluribus-context@latest validate
npx --yes pluribus-context@latest sync --dry-run
npx --yes pluribus-context@latest audit --ci --json --output pluribus-audit.json || test $? -eq 1
```

npm `latest` is currently aligned with the latest GitHub release. If a future GitHub release is newer than npm `latest`, review that release directly instead of waiting for the npm dist-tag:

```bash
npm exec --yes --package github:caioribeiroclw-pixel/pluribus#v0.3.26 -- pluribus --version
npm exec --yes --package github:caioribeiroclw-pixel/pluribus#v0.3.26 -- pluribus help
```

Expected result:

- `--version` prints the current npm release. During a future release-lag window, it prints the GitHub release version when using the `npm exec --package github:...` fallback.
- `init --dry-run` previews `pluribus.md` without writing.
- `init` writes `pluribus.md`.
- `validate` succeeds.
- `sync --dry-run` previews generated context files without writing them.
- `audit --ci` may exit `1` before generated files are synced; that is expected when outputs are missing or drifted.

## 60-second native-vs-fallback smoke

Use this when reviewing the fidelity-audit positioning. It demonstrates the difference between a native tool discovery surface and a generic fallback in a clean directory:

```bash
mkdir pluribus-fidelity && cd pluribus-fidelity
npx --yes pluribus-context@latest init --name "Fidelity review" --description "Native vs fallback smoke" --tools bob,openclaw
npx --yes pluribus-context@latest sync
npx --yes pluribus-context@latest audit --json --fidelity-report --output fidelity.json
node -e "const r=require('./fidelity.json'); console.log(r.fidelityReport.targets.map(t => ({ toolId: t.toolId, file: t.files[0], nativeDiscoverySurface: t.nativeDiscoverySurface, genericFallback: t.genericFallback, manualActivationRequired: t.manualActivationRequired, effectiveContextScope: t.effectiveContext?.scope, loadedBy: t.loadEvidence?.loadedBy, dedupeRisk: t.loadEvidence?.dedupeRisk, duplicateRisk: t.duplicateLoadEvidence?.duplicateRisk, selectedLoad: t.duplicateLoadEvidence?.selectedLoad?.path })))"
```

Expected result:

- Bob writes `.bob/rules/pluribus.md` and reports `nativeDiscoverySurface: ".bob/rules/*.md"`, `genericFallback: false`, `manualActivationRequired: false`.
- OpenClaw writes `AGENTS.md` and reports `nativeDiscoverySurface: "AGENTS.md"`, `genericFallback: true`, `manualActivationRequired: false`.
- Both targets report `effectiveContext.scope: "repo-root"` and `pathScoped: false`; for monorepos this is a warning that subdirectory inheritance/isolation still needs a separate smoke.
- Both targets include `loadEvidence`: Bob is `loadedBy: "native-file-discovery"`; OpenClaw is `loadedBy: "generic-agent-file"`; both currently report `dedupeRisk: "unknown"` because Pluribus does not prove runtime deduplication across native files, hooks, generated imports, or manual injection.
- Both targets include `duplicateLoadEvidence`: the Pluribus generated file is the only candidate Pluribus can name, with a `contentIdentity` hash and `selectedLoad`, but `duplicateRisk: "unknown"` because runtime scanner roots, caches, plugin directories, and sibling tool skill/rule folders are not inspected or suppressed by this smoke.
- This is the core Pluribus distinction for reviewers: generated file exists is not enough; the report should show whether the target uses native discovery or a generic fallback, how the context is expected to be loaded, and what effective context scope has actually been proven.

## Useful links

- npm package: <https://www.npmjs.com/package/pluribus-context>
- GitHub repo: <https://github.com/caioribeiroclw-pixel/pluribus>
- Quickstart: <https://github.com/caioribeiroclw-pixel/pluribus/blob/main/docs/quickstart.md>
- Context drift audit guide: <https://github.com/caioribeiroclw-pixel/pluribus/blob/main/docs/context-drift-audit.md>
- When to use Pluribus: <https://github.com/caioribeiroclw-pixel/pluribus/blob/main/docs/when-to-use-pluribus.md>
- First-run audit feedback: <https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=audit-feedback.yml>

## Feedback links

Use the narrowest public path that matches what you tested:

- Directory/listing/reviewer fit or copy feedback: <https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=review-feedback.yml>
- Read-only audit result or unclear next step: <https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=audit-feedback.yml>
- Quickstart/install/setup confusion: <https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=quickstart-feedback.yml>
- Broader workflow notes about managing AI context across tools: <https://github.com/caioribeiroclw-pixel/pluribus/discussions/13>

## Feedback requested

If you try it on a real repo, please do not paste secrets, private source code, credentials, customer data, or internal instructions that should not be public. Avoid pasting private context or full audit JSON from non-public projects. The most useful report is:

1. OS/shell and exact Pluribus version.
2. Which context files already existed (`CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, etc.).
3. Whether `audit` identified the expected missing/drifted files.
4. Whether the next safe step was obvious (`init`, edit `pluribus.md`, `sync --dry-run`, or `sync`).
