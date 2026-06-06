# Skill policy receipts recipe

This is a copyable Agent Skill recipe for cases where a natural-language rule needs an inspectable guard.

Example use cases:

- a Skill must not generate tests for internal services;
- an agent must not edit generated files;
- a hook must not call production APIs;
- a migration helper must default to preview/dry-run unless `--apply` is explicit.

Copy `SKILL.md` into your Skill registry, adjust the policy and post-write guard, then ask the agent to emit `skill.policy.v1` receipts before writes and after guard checks.

The receipt should prove:

- intended targets were listed;
- each target was allowed or refused;
- refusal happened before writes;
- post-write guard passed or failed;
- no raw prompt, code, secret, customer data, stack trace, or full transcript was logged.

Related guide: [`docs/skill-policy-receipts.md`](../../docs/skill-policy-receipts.md).
