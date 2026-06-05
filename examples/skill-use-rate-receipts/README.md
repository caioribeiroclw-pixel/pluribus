# Skill use-rate receipts

This example shows a privacy-safe receipt for the gap between installing an Agent Skill and actually using it.

```bash
node check-skill-use-rate.mjs skill-use-rate-receipt.json
```

Expected output:

```text
skill use-rate receipt ok: 3 skills checked, 1 unused install warning
- rust-lsp-helper is installed/attached but has 0 invocations in this window
```

The warning is intentional: installation is not adoption. A skill can be installed, attached, and discoverable while still adding context surface area with no observed invocation.
