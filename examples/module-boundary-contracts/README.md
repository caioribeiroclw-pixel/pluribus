# Module boundary contract receipts

This example is for the common Claude Code/Cursor failure mode: the repo structure is not just messy for humans; it gives the agent no stopping rule. Small files help, but small files plus explicit module contracts help more.

A module contract should be tiny and local. It tells an agent:

1. what belongs in this module;
2. which imports are allowed or forbidden;
3. which paths it may edit without widening scope;
4. the smallest verifier command that proves the layer still works; and
5. when to stop and ask for a wider contract.

The receipt proves the contract was actually used before the edit, without logging source code, prompts, customer data, or private paths.

## Files

- `module-contract.json` — copyable contract for an `api` module.
- `safe-edit-receipt.json` — edit stayed inside `src/api/` + `test/api/`, used allowed imports, and ran the module verifier after the last edit.
- `unsafe-edit-receipt.json` — edit touched `src/ui/` and used a forbidden import prefix, so the correct decision is `needs_wider_contract` even if the narrow verifier passed.
- `check-module-contract.mjs` — tiny validator for the demo receipts.

## Try it

```bash
node examples/module-boundary-contracts/check-module-contract.mjs safe-edit-receipt.json
node examples/module-boundary-contracts/check-module-contract.mjs unsafe-edit-receipt.json || true
```

Expected behavior: the safe receipt passes. The unsafe receipt fails with the exact boundary violations. That is the point: a green verifier is not enough if the agent widened the module boundary without permission.

## Minimal receipt shape

```json
{
  "receipt_type": "pluribus.module_boundary_contract.v1",
  "contract_id": "api-module-v1",
  "agent_read_contract": true,
  "changed_paths": ["src/api/orders.ts", "test/api/orders.test.ts"],
  "import_prefixes_used": ["src/services/", "src/lib/"],
  "verifier": {
    "command": "npm test -- --run test/api",
    "exit_code": 0,
    "completed_after_last_edit": true
  },
  "decision": "accepted",
  "privacy": {
    "raw_source_included": false,
    "raw_prompt_included": false
  }
}
```

Use this when a team asks, "How should we structure a repo so coding agents behave?" The narrow answer is: give each module a contract the agent can read, edit within, verify, and stop at.
