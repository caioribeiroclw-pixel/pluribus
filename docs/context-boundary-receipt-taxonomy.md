# Context-boundary receipt taxonomy

Context-engineering tools are starting to say "receipt" for many different things: token ledgers, memory citations, session summaries, cost reports, final-answer provenance, and audit trails. That is good market validation, but it makes the word less useful unless the boundary is named.

Pluribus uses **context-boundary receipt** narrowly:

> a privacy-safe evidence object proving what crossed, did not cross, or was transformed at a specific agent boundary before a risky action, handoff, resume, review, or write.

It should help a reviewer answer: **what changed authority over this run, and can I trust the next step without reading the raw transcript or private source material?**

## The receipt is only meaningful if the boundary is explicit

Do not start with "we need a receipt". Start with the boundary:

| Boundary | Question the receipt answers | Typical fields | Not the receipt's job |
| --- | --- | --- | --- |
| Source -> rendered output | Did a canonical manifest, rule file, or shared context render correctly for Claude Code, Cursor, VS Code, Codex, OpenClaw, etc.? | source hash, target client, before/rendered hash, env key names, missing keys, rollback snapshot | store secrets or dump full client config |
| Import -> local authority | Did an imported file, memory, package, Skill, or handoff packet become authoritative locally? | source id/ref/hash, destination, accepted/rejected action, verifier, evidence checked, omitted items | decide the human policy for acceptance |
| Search/index -> loaded context | Did retrieval, memory, RAG, or code search return and load the right cited material? | query id/hash, corpus/index digest, candidate ids, selected citations, stale/collision warnings, excluded files | replace the memory database or vector index |
| Transform -> forwarded context | Did pruning, caching, compaction, summarization, reranking, or compression alter what the model could see? | original/forwarded hashes, protected blocks, stubbed/removed buckets, expand events, fail-open reason | prove final answer correctness by itself |
| Harness -> model run | What did the runtime load, suppress, approve, persist, and permit? | model, tools, permissions, context sources, omitted state, human gates, diff/test evidence | orchestrate the run or expose raw prompts |
| Agent output -> durable state | Why did an agent patch, note, lesson, config write, or memory update cross from proposal into durable state? | run id, decision, actor, base/head hashes, files touched, trace/diff hash, rollback ref | rubber-stamp agent output |
| Phase -> next phase | Is it safe to move from explore to spec, spec to implementation, implementation to review, or pre-compact to post-compact? | phase id, allowed inputs, produced artifact, required evidence, dropped context, stop conditions | replace project management or scheduling |

A receipt that does not name its boundary becomes a vague audit log. A receipt that names the wrong boundary creates false confidence.

## Review rule: authority, not just existence

For each receipt, separate these states:

1. `available` — the source existed somewhere.
2. `discovered` — the runtime or tool catalog could see it.
3. `selected` — it matched the task or policy.
4. `loaded` — it actually entered the model/run boundary.
5. `invoked_or_used` — it influenced a tool call, decision, write, or answer.
6. `persisted_or_promoted` — it became durable memory, config, instruction, code, or approved state.
7. `omitted_or_deferred` — it intentionally stayed out, with a reason.

Most failures hide in the gaps: installed but not loaded, cited but from a stale index, summarized but not safe to resume, rendered but different per client, accepted without verifier scope, or rolled back from the wrong state authority.

## Privacy rules

A context-boundary receipt should prefer ids, hashes, coarse buckets, change kinds, and explicit privacy flags.

Do not log raw prompts, full transcripts, source code, private paths, customer data, secrets, tokens, OAuth cookies, raw tool output, or full memory bodies unless the user explicitly chooses a local/private mode for that material.

Useful proof does not require content dumps. It requires stable evidence that the boundary behaved as claimed.

## Where existing Pluribus docs fit

- Source -> rendered output: [Rendered output receipts](rendered-output-receipts.md)
- Harness/runtime comparison: [Agent runtimes vs context receipts](runtime-vs-receipts.md)
- Startup/tool/memory budget: [Context-budget receipts](context-budget-receipts.md)
- Retrieval and delivered context: [Context input evidence](context-input-evidence.md)
- Memory facts becoming authority: [Memory provenance + authority receipts](memory-provenance-authority-receipts.md)
- Compaction/resume safety: [Compaction resume receipts](compaction-resume-receipts.md)
- Review gates and handoff continuation: [Review primitive gate](review-primitive-gate.md)
- Install/load state: [Install-plan receipts](install-plan-receipts.md) and [Skill install/load receipts](skill-install-receipts.md)

## Quick diagnostic

If a new tool claims it emits a "receipt", ask four questions:

1. **Boundary:** receipt for which transition?
2. **Authority:** did this source merely exist, or did it govern the next action?
3. **Correctness:** what false-positive/false-negative would make reviewers stop trusting it?
4. **Privacy:** can the proof be reviewed without exposing the raw material?

If those answers are concrete, Pluribus can sit beside the tool and help make the boundary auditable. If they are vague, the artifact is probably a report, summary, or ledger — useful, but not yet a context-boundary receipt.
