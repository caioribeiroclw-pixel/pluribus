# Provider degradation canary receipt

A tiny gate for agent runs when the model/provider may be silently degraded: slower than normal, timing out, drifting on tool calls, breaking JSON, or producing weaker code edits while the status page still looks green.

Use this before side-effecting agent actions such as patches, PRs, migrations, shell commands, deploys, or external writes. The receipt does **not** log prompts or model outputs. It records transport health, cheap capability canaries, and the decision to continue, fallback, pause writes, or stop.

## Prompt / harness pattern

```text
Before this agent run writes anything, record a degradation decision:
- provider/model/region and prompt template hash
- latency/error summary for the run window
- capability canaries that match this app: JSON schema, tool choice, patch format, refusal/over-refusal, citation grounding
- failed canaries and severity
- fallback chosen, if any
- write gate: continue, read_only, fallback_model, pause_writes, or stop
- confidence: provider_degraded, app_bug, network, unknown, or healthy
```

If tool-choice or patch-format canaries fail, keep read-only analysis alive but pause writes until a fallback or human review confirms the agent can still act safely.

## Run the sample checker

```bash
cd examples/provider-degradation-canaries
node check-degradation-receipt.mjs --receipt healthy-decision.json
```

The bundled healthy receipt passes because transport is stable, app-critical canaries pass, and the write gate is allowed.

A degraded write attempt should fail:

```bash
node check-degradation-receipt.mjs --receipt unsafe-write-decision.json
```

## Receipt shape

```json
{
  "schema": "pluribus.provider_degradation_decision.v1",
  "run_id": "agent-run-2026-06-15T20:02Z",
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "region": "us-east-1",
  "prompt_template_hash": "sha256:...",
  "canary_suite_version": "coding-agent-smoke-2026-06-15",
  "transport": {
    "window_minutes": 10,
    "ttft_p95_ms": 1400,
    "total_latency_p95_ms": 9200,
    "timeout_rate": 0.01,
    "error_rate": 0,
    "retry_count": 1,
    "status_incident_url": null
  },
  "capability_canaries": [
    { "name": "json_schema", "status": "pass", "severity": "write_blocking" },
    { "name": "tool_choice", "status": "pass", "severity": "write_blocking" },
    { "name": "patch_format", "status": "pass", "severity": "write_blocking" }
  ],
  "fallback": { "chosen": false, "reason": null },
  "confidence": "healthy",
  "write_gate": "continue"
}
```

## Why this exists

The market signal from Claude Code / API builders is practical: when an LLM silently degrades, teams lose time deciding whether provider behavior, network health, prompt changes, or their own code caused the failure.

This receipt keeps that decision falsifiable:

- latency alerts and provider status are separated from capability drift;
- canaries are app-critical, not generic benchmarks;
- side-effecting actions get stricter gates than read-only analysis;
- fallback and pause decisions are recorded as evidence, not hidden in transcripts.

Pair this with Pluribus context receipts when runtime inputs are the problem. Use this receipt when the question is whether the model/provider is currently reliable enough to let an agent keep writing.
