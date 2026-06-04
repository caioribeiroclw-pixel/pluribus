# Parallel session review ledger example

This example is a copyable receipt for teams running multiple agent sessions at once. It is designed for the review bottleneck: deciding whether each session can be trusted, continued, or rejected without reading an entire transcript.

```bash
node examples/parallel-session-review-ledger/check-parallel-session-review-ledger.mjs examples/parallel-session-review-ledger/parallel-session-review-ledger.json
```

Expected output:

```text
parallel session review ledger ok: 3 sessions checked
```
