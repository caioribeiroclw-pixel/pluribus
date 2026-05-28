## AI PR review receipt

This PR was prepared or modified by an AI coding agent. Review by blast radius, not by diff size alone.

### Boundary receipt

| Boundary | Status | Evidence | Risk tier | Owner / blocker |
| --- | --- | --- | --- | --- |
| Schema / persisted data contract | `touched / not_touched / ambiguous` |  |  |  |
| Live reader/writer compatibility | `checked / missing / n/a` |  |  |  |
| Async jobs / queues / cron / webhooks | `touched / not_touched / ambiguous` |  |  |  |
| Rollout gate / feature flag / kill switch | `present / missing / n/a` |  |  |  |
| External side effects | `declared / not_touched / ambiguous` |  |  |  |
| Generated files / public API / plugin config | `touched / not_touched / ambiguous` |  |  |  |

### Checks

- [ ] Tests relevant to touched boundaries passed.
- [ ] Migration/backfill/rollback behavior is explicit, or not applicable.
- [ ] External side effects are declared, or not touched.
- [ ] Any `ambiguous` boundary has an owner before merge.

### Privacy

This receipt does not include raw prompts, transcripts, source code, secrets, customer data, stack traces, or raw tool output.

### Decision

`merge_ready: yes/no`

`next_safe_action:`
