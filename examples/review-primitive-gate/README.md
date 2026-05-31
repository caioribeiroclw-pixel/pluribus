# Review primitive gate example

This example validates a privacy-safe agent handoff receipt as a reviewer/CI primitive.

Run the passing fixture:

```bash
node examples/review-primitive-gate/check-review-receipt.mjs \
  examples/review-primitive-gate/pass-review-receipt.json
```

Run the failing fixture:

```bash
node examples/review-primitive-gate/check-review-receipt.mjs \
  examples/review-primitive-gate/fail-review-receipt.json
```

The script exits non-zero if the run is partial/unsafe, if a required check failed or was skipped, or if the agent changed scope/access without approval.
