# Composable Contexts

Pluribus supports local context imports so teams can share a base context and let each project add or override what is specific to that repo.

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

## Safety rules in the MVP

The first implementation is intentionally local-only:

- ✅ `# @import ./relative/path.md`
- ✅ nested imports up to depth `5`
- ✅ cycle detection
- ✅ path-escape protection outside the project root
- ❌ `github:` imports for now
- ❌ `http://` or `https://` imports for now
- ❌ shell execution during import resolution

Remote imports need stricter cache, auth, timeout, and supply-chain rules before they are safe enough to ship.

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
