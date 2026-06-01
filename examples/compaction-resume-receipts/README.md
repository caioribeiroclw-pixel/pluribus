# Compaction resume receipt gate

This example validates a privacy-safe receipt for `PostCompact`, `SessionStart(compact)`, or any workflow that resumes an AI coding session after summarization.

Run:

```bash
node check-resume-receipt.mjs safe-resume-receipt.json
node check-resume-receipt.mjs unsafe-resume-receipt.json
```

Use it as a tiny CI/hook check before an agent continues work after compaction. The receipt records hashes, refs, and verdicts — not raw transcripts or raw instruction bodies.
