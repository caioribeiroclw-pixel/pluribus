# Instruction-context audit receipt

This demo records which instruction/authority surfaces were active in an AI coding session without storing raw prompt, instruction, transcript, source, or tool-output text.

Run:

```bash
npx --yes pluribus-context@latest demo instruction-context-audit
npx --yes pluribus-context@latest demo instruction-context-audit --json
```

Use this when `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*`, Copilot instructions, Skills, or generated context packs can influence agent behavior. The receipt keeps hashes/status/review state so reviewers can distinguish reviewed local instructions from stale, generated, unreviewed, or externally influenced context before those files become command authority.
