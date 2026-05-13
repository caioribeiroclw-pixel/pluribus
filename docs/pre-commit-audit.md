# Pre-commit Audit Hook

Use this when you want a local guard before CI, but do not want Pluribus to write files automatically.

The hook runs `pluribus audit --strict` and fails the commit when generated context files are missing or drifted from `pluribus.md`.

## Copy-paste hook

From your project root:

```bash
mkdir -p .git/hooks
cat > .git/hooks/pre-commit <<'EOF'
#!/usr/bin/env sh
set -eu

# Keep generated AI context files aligned with pluribus.md before committing.
# Install by copying this file to .git/hooks/pre-commit and running chmod +x.

if [ ! -f pluribus.md ]; then
  exit 0
fi

npx --yes pluribus-context@latest audit --strict
EOF
chmod +x .git/hooks/pre-commit
```

Now commits fail if `CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, or other generated outputs are stale.

To fix drift:

```bash
npx --yes pluribus-context@latest sync --dry-run
npx --yes pluribus-context@latest sync
```

Review the generated files, then commit `pluribus.md` and the regenerated outputs together.

## With Husky

If your repo already uses Husky:

```bash
npx husky init
cat > .husky/pre-commit <<'EOF'
#!/usr/bin/env sh
set -eu

if [ ! -f pluribus.md ]; then
  exit 0
fi

npx --yes pluribus-context@latest audit --strict
EOF
chmod +x .husky/pre-commit
```

## When not to use this

Do not add the hook before the team agrees that generated context files should be kept in sync. For early evaluation, run the read-only command manually first:

```bash
npx --yes pluribus-context@latest audit
```

If your team prefers server-side enforcement only, use the [CI audit example](ci-audit-example.md) instead.
