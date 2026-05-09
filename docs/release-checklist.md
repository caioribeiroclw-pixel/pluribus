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

## 2. Local release gate

Run the consolidated release gate from the repo root:

```bash
npm run release:verify
```

The verifier requires a clean `main...origin/main` checkout, reports the local package version versus npm latest, reports whether `npm whoami` is authenticated, then runs `npm test`, `git diff --check`, `npm run release:smoke`, `npm pack --dry-run`, and `npm publish --dry-run`. If npm auth is missing, the verifier still proves the package is technically ready and names auth/2FA as the remaining publish blocker.

If you need to debug an individual step, run it directly:

```bash
npm test
git diff --check
npm run release:smoke
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
npm run release:smoke
```

The script packs the current checkout, installs that tarball into a temporary project, runs `pluribus --version`, `--help`, `init`, `validate`, `audit`, `sync --dry-run`, a real `sync`, and `audit --strict`, then checks that generated output includes the package version from `package.json`. It also removes the temporary project and generated tarball on exit.

Expected results:

- `pluribus --version` matches `package.json`.
- `pluribus --help` shows the same version.
- generated files mention the same Pluribus version.
- `validate`, `audit`, and `sync --dry-run` work from the installed package, not the repo checkout.
- `audit --strict` passes after generated files are written.

## 4. Publish

Only publish after npm auth is active and the dry run is clean:

```bash
npm publish --access public
```

Then verify the registry entry and the install path users will see:

```bash
npm view pluribus-context version dist.tarball
npm view pluribus-context readme | grep -E 'npx --yes pluribus-context|60-second smoke test|Published to npm'
npx --yes pluribus-context --help
```

The npm README is captured at publish time. If the GitHub README changed after the previous publish, confirm the npm package page no longer contains stale pre-release markers such as `once published` before starting distribution.

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
