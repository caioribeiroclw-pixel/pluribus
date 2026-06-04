# Skill install/load receipt example

This example is for setup tools that install Skills across multiple agents and then need to prove whether each target can discover/load the installed resource before the first real session.

It complements:

- `examples/install-plan-receipts/` — pre-write plan proof (`writes_started=false`);
- `examples/loaded-resource-boundary/` — runtime proof that an existing resource crossed discovery/attachment/injection/readability stages.

## Smoke test

```bash
node examples/skill-install-receipts/check-skill-install-receipt.mjs \
  examples/skill-install-receipts/skill-install-receipt.json
```

Expected output:

```text
skill install receipt ok: 3 targets checked
```

## Review checklist

A useful receipt should answer:

- What installer/source ref was used, without credentials?
- Which agent targets and scopes were touched?
- Which targets were installed, skipped, discovered, deferred, injected, or readable?
- Was any required target unsafe before the first session?
- Did the receipt avoid raw skill bodies, prompts, transcripts, env dumps, secrets, and private paths?
