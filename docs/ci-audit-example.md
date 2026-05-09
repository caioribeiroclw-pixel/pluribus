# CI audit example

Use this when `pluribus.md` is the source of truth and generated context files should stay current in pull requests.

`pluribus audit --strict` is read-only: it fails when a generated file is missing or drifted, but it does not rewrite anything in CI. The basic audit command is published in `pluribus-context@0.3.0`; the `--github-annotations`, `--json`, `--output`, and `--ci` flags below are prepared in `main` for the next npm patch release `0.3.1`. Until that patch is published, pin CI to `pluribus-context@0.3.0` for the strict text check, or test the new flags from source with `--package github:caioribeiroclw-pixel/pluribus#main`.

Use `--ci` in GitHub Actions when you want the shortest path: it is equivalent to `--strict --github-annotations`, so drift appears inline in the check UI and the job fails on drift. Use the explicit flags when composing custom outputs; pair annotations with `--json --output pluribus-audit.json` when you want a machine-readable artifact for dashboards or review comments. The output contract is documented in [`schemas/audit-result.schema.json`](../schemas/audit-result.schema.json).

## GitHub Actions

Create `.github/workflows/pluribus-audit.yml` in the repository that uses Pluribus:

```yaml
name: Pluribus context audit

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 22.x

      - name: Audit AI context drift
        run: npx --yes pluribus-context audit --ci
```

If you want JSON output as an artifact, use this variant:

```yaml
      - name: Audit AI context drift as JSON
        run: npx --yes pluribus-context audit --ci --json --output pluribus-audit.json

      - name: Upload Pluribus audit result
        if: always()
        uses: actions/upload-artifact@v5
        with:
          name: pluribus-audit
          path: pluribus-audit.json
```

## Local repair loop

When CI fails:

```bash
npx --yes pluribus-context audit
npx --yes pluribus-context sync --dry-run
npx --yes pluribus-context sync
npx --yes pluribus-context audit --strict
# In GitHub Actions, use:
npx --yes pluribus-context audit --ci
```

Commit `pluribus.md` and the generated files together, or document that your team regenerates generated files during setup. Do not commit `.pluribus/cache/remote/`; commit `pluribus.lock.json` when you use remote imports.

## Remote imports in CI

Normal `audit`, `sync`, and `validate` runs do not fetch remote imports. They use the committed `pluribus.lock.json` plus the local cache. If CI fails because a remote import is unlocked or cache-missing, refresh it locally with:

```bash
npx --yes pluribus-context sync --update-imports
```

Then review and commit the updated `pluribus.lock.json` with the generated outputs. Use `GH_TOKEN`/`GITHUB_TOKEN` only when refreshing private GitHub imports; Pluribus never writes tokens to the lockfile or cache.
