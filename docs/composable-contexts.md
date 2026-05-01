# Composable Contexts

Pluribus supports context imports so teams can share a base context and let each project add or override what is specific to that repo.

Use this when you have one set of org/team conventions that should be inherited by multiple projects, but each project still needs its own stack, goals, constraints, or examples.

## Import syntax

Add import directives near the top of `pluribus.md`:

```markdown
# @import ./shared/team-context.md
# @import ./shared/security-constraints.md

# Identity
I am Ana, building **Conduit** — a background job runner for Node.js.

# Goals
1. Ship a small, reliable CLI first
2. Keep runtime dependencies minimal
```

Import paths are resolved relative to the file that contains the directive.

## Merge behavior

Imported files are expanded before the local file content. That means local sections win when a section appears in both places:

```markdown
# @import ./shared/base-context.md

# Conventions
Project-specific conventions override the shared `# Conventions` section.
```

This keeps the inheritance model simple:

1. shared/org context first
2. team context next
3. project-local context last

## Safety rules

Local imports are deterministic by default:

- ✅ `# @import ./relative/path.md`
- ✅ nested imports up to depth `5`
- ✅ cycle detection
- ✅ path-escape protection outside the project root
- ❌ shell execution during import resolution

Remote imports are explicit opt-in via `pluribus sync --update-imports`:

- ✅ `github:owner/repo/path.md[@ref]` public raw imports
- ✅ direct `https://...` Markdown/text imports
- ✅ HTTPS only; `http://` is rejected
- ✅ request timeout, redirect limit, UTF-8/text content checks, per-file and merged-size limits
- ✅ credential-bearing URLs are rejected/redacted in errors
- ✅ nested relative imports inside `github:` resources stay in the same repo/ref
- ✅ `pluribus sync --update-imports` writes `pluribus.lock.json` and `.pluribus/cache/remote/`
- ✅ later plain `pluribus sync` runs reuse the locked cache offline with SHA-256 verification
- ❌ relative imports from arbitrary HTTPS documents
- ❌ private GitHub auth flow for now

Remote imports are deliberately disabled unless `--update-imports` is passed so normal sync runs do not perform silent network access. Once a remote import is locked, normal sync runs read it from the local cache instead of the network. If a remote import has no lock entry/cache yet, sync fails closed and asks you to refresh with `--update-imports`.

## Example layout

```text
my-project/
├── pluribus.md
└── shared/
    ├── team-context.md
    └── security-constraints.md
```

`pluribus.md`:

```markdown
# @import ./shared/team-context.md
# @import ./shared/security-constraints.md

# Identity
I am Ana, building **Conduit** — a background job runner for Node.js.

# Stack
- Node.js 22 LTS
- TypeScript strict mode

# Goals
1. Ship the CLI first
2. Keep install size small
```

`shared/team-context.md`:

```markdown
# Conventions
- Prefer small, explicit functions
- Use named exports only
- Tests live next to the source file
```

`shared/security-constraints.md`:

```markdown
# Constraints
- Never execute shell commands from context files
- Never write outside the project root
- Never add network calls without explicit review
```

Then run:

```bash
pluribus sync --dry-run
```

Pluribus resolves the imports, parses the merged context, and generates the selected tool files from the resolved content.

## Current limitation

The current parser treats top-level section names as unique, and the later section wins if a duplicate appears after imports. Use duplicate sections deliberately for overrides; if you want additive behavior, put shared and local details under different section names such as `# Team` and `# Workflow`.
