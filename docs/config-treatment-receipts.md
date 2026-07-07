# Config treatment receipts

Config doctors and migration scripts can clean up scattered AI-agent configuration, but reviewers still need proof that the treated config actually crossed into each target surface.

Use a `config-treatment-receipt` after a tool rewrites, canonicalizes, or syncs files such as `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, Copilot instructions, Gemini instructions, Skill manifests, hooks, or settings. The receipt is not a copy of the private rules. It is a small, privacy-safe sidecar that records what became authoritative, which target files were touched, what each target actually loaded, and when the treatment becomes stale.

## When to use it

- A config doctor merges scattered rule files into a canonical `AGENTS.md` or `pluribus.md`.
- A team copies a global Claude Code setup into project-local files for reproducibility.
- A migration script installs stubs for Cursor, Copilot, Windsurf, Zed, Continue, Codex, Gemini, or Claude Code.
- CI needs a drift gate proving generated target files still match the canonical source.
- A reviewer wants evidence that a target tool loaded the treated config instead of a stale global/user copy.

## Boundary it proves

```
canonical rules + treatment script -> target tool config surface -> loaded authority
```

A successful receipt should answer:

1. Which canonical authority was used?
2. Which treatment command/version rewrote or installed targets?
3. Which target surfaces were touched?
4. Did each target load the treated file, truncate it, block it, or miss it?
5. Which private payloads were intentionally omitted from evidence?
6. What drift gate or eval proves the treatment still holds?
7. What should make a later agent re-check instead of trusting the receipt?

## Minimal shape

```json
{
  "schema": "pluribus.config_treatment_receipt.v1",
  "subject": {
    "repo": "acme/payments-api",
    "commit": "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
    "treatment_id": "config-doctor-2026-07-07T15:00Z"
  },
  "treatment": {
    "tool": "ai-harness-doctor",
    "tool_version": "0.1.0",
    "command": "ai-harness-doctor fix --emit-receipt",
    "authority_home": "AGENTS.md"
  },
  "canonical_authority": {
    "ref": "AGENTS.md",
    "hash": "sha256:4e3f...",
    "summary": "project coding standards and AI-agent constraints"
  },
  "target_surfaces": [
    {
      "tool": "claude-code",
      "target_file": "CLAUDE.md",
      "stub_hash": "sha256:9d42...",
      "loaded_hash": "sha256:9d42...",
      "load_status": "loaded",
      "shadowing": "project overrides global baseline"
    }
  ],
  "verification": {
    "drift_gate": "npm run ai-config:check",
    "eval_ref": "config-eval/2026-07-07.json",
    "status": "passed",
    "not_checked": ["interactive IDE plugin cache"]
  },
  "privacy": {
    "raw_rules_included": false,
    "raw_prompts_included": false,
    "secrets_included": false,
    "customer_data_included": false,
    "omitted_private_payloads": ["internal compliance clauses"]
  },
  "verdict": "usable",
  "stale_if": [
    "canonical AGENTS.md hash changes",
    "target stub hash differs from loaded hash",
    "Claude Code global config shadows project file",
    "tool load limit truncates target file",
    "drift gate has not run on current commit"
  ]
}
```

## Try the packaged example

```bash
node examples/config-treatment-receipts/check-config-treatment-receipt.mjs \
  examples/config-treatment-receipts/config-treatment-receipt.json
```

Expected output:

```text
config treatment receipt ok: 3 target surfaces, 1 omitted private payload, verdict usable
privacy ok: no raw rules/prompts/secrets/customer data copied
```

## Design notes

- Store hashes and summaries, not raw private standards.
- Treat `loaded`, `truncated`, `missing`, and `blocked` as different outcomes. A copied file is not proof of load.
- Record global-vs-project shadowing because Claude Code, Cursor, Copilot, hooks, Skills, and settings do not all merge the same way.
- Keep Git or the repo as the durable byte ledger; use the receipt to prove effective agent authority.
- Make `stale_if` operational. A later agent should know when to re-run the config doctor or drift gate before editing.

## Related receipts

- [Agent change manifest](agent-change-manifest.md) — attach authority/check evidence to agent-written commits.
- [Agent surface proof chain](agent-surface-proof-chain.md) — separate install, sync, surface state, selection traces, and handoff evidence.
- [Stale rule authority sweep](https://github.com/caioribeiroclw-pixel/pluribus/tree/main/examples/stale-rule-authority-sweep) — demote old durable rules that no longer have live evidence.
