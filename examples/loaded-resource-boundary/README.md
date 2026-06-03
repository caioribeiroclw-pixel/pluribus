# Loaded-resource boundary example

This example turns "my Skill works in chat but disappears in ACP/Zed/CLI" into a stage-level receipt.

Run:

```bash
node check-loaded-resource-boundary.mjs loaded-resource-boundary.json
```

Expected output:

```text
loaded-resource boundary ok: 1 required resource/runtime gap recorded
```

The sample records the same project skills across two sessions:

- `chat` discovers, attaches, injects, and reads `skill:pr-review`;
- `acp`/`zed` discovers and attaches it, but never injects it, so the receipt records `runtime_does_not_inject_resources` and sets `safe_to_continue=false`.

Use this shape when prompt instructions cannot explain a missing Skill. The host/runtime needs to prove the resource crossed the boundary, not merely that it exists on disk.
