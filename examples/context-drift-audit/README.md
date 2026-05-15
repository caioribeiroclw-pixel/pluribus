# Context drift audit example

This fixture shows the safest first Pluribus workflow for an existing repo: audit generated AI context before writing anything.

`pluribus.md` is the source of truth. `CLAUDE.md` is intentionally drifted: it says `Node.js 20 LTS` while `pluribus.md` says `Node.js 22 LTS`. Cursor and Copilot outputs are current.

Run from this directory with the published package:

```bash
npx --yes pluribus-context@latest audit --strict
```

Expected result:

```text
⚠️  [claude] CLAUDE.md differs from generated output
✅ [cursor] .cursorrules is current
✅ [copilot] .github/copilot-instructions.md is current
```

Preview the fix without writing files:

```bash
npx --yes pluribus-context@latest sync --dry-run
```

Then apply it when the diff is acceptable:

```bash
npx --yes pluribus-context@latest sync
```
