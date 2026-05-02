# Release checklist

This checklist keeps Pluribus releases reproducible and avoids accidentally publishing stale context, missing docs, or a package name that collides with an unrelated project.

## 0. Preconditions

- Work from a clean `main` branch tracking `origin/main`.
- Confirm the package name is available or intentionally chosen:
  - `npm view pluribus-context name version description`
  - `npm view pluribus name version description` — expected to return an unrelated package, so do not publish as `pluribus`.
- Confirm npm auth only through the npm CLI/session, never by writing tokens into the repo:
  - `npm whoami`

## 1. Version and release notes

- Update `package.json` version.
- Update `CHANGELOG.md` with user-facing changes, migration notes, and verification commands.
- Confirm README install commands use the package name `pluribus-context` and that the binary remains `pluribus`.

## 2. Local checks

Run from the repo root:

```bash
npm test
git diff --check
npm pack --dry-run
npm publish --dry-run
```

The dry-run package should include at least:

- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `bin/pluribus.js`
- `src/`
- `docs/`
- `spec/`
- `examples/`

## 3. Tarball install smoke

Before publishing, install the exact tarball that `npm pack` creates into a temporary project and run the CLI as a user would. This catches version drift or missing packaged files that unit tests and dry-runs can miss.

```bash
TARBALL="$(npm pack --silent)"
TMP_DIR="$(mktemp -d)"
(
  cd "$TMP_DIR"
  npm init -y >/dev/null
  npm install "$OLDPWD/$TARBALL" >/dev/null
  npx --no-install pluribus --version
  npx --no-install pluribus --help
  npx --no-install pluribus init --force
  npx --no-install pluribus validate
  npx --no-install pluribus sync --dry-run
)
rm -rf "$TMP_DIR" "$TARBALL"
```

Expected results:

- `pluribus --version` matches `package.json`.
- `pluribus --help` shows the same version.
- generated files mention the same Pluribus version.
- `validate` and `sync --dry-run` work from the installed package, not the repo checkout.

## 4. Publish

Only publish after npm auth is active and the dry run is clean:

```bash
npm publish --access public
```

Then verify:

```bash
npm view pluribus-context version dist.tarball
npx pluribus-context --help
```

## 5. GitHub release

After npm publish succeeds:

- Tag the exact published commit: `vX.Y.Z`.
- Create a GitHub release using the matching `CHANGELOG.md` section.
- Link the npm package and the GitHub release from any launch post or reply.

## 6. Post-release monitoring

Within the next work block, check:

- GitHub Actions for the release commit/tag.
- GitHub issues/notifications.
- npm package page metadata.
- Any X/Reddit/Discord replies mentioning install problems.

If install fails or package contents are wrong, do not keep posting. Patch, test, publish a fix version, and document what changed.
