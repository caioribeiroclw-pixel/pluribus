# Agent change manifest

Git tells reviewers which bytes changed. Agent-heavy work needs one more, smaller artifact: why the agent believed the change was safe, which context governed it, and what would make that claim stale.

Use an `agent-change-manifest` when a commit, branch, patch, or pull request was produced mostly by Claude Code, Codex, Cursor, OpenClaw, or another coding agent. The manifest is not a transcript store and not a replacement for Git. It is a privacy-safe sidecar that lets a later agent or human reviewer resume review without trusting a chat summary.

## Boundary

```text
agent session + loaded context + verification evidence
  -> git commit / branch / PR
  -> next reviewer or downstream agent
```

The failure mode is subtle: `git diff` is accurate about bytes, but not about authority. It does not say which task scope was approved, which rule files were loaded, which tests actually ran, which assumptions were not checked, or whether a later branch/index/config change invalidated the claim.

## Minimal fields

```json
{
  "schema": "pluribus.agent_change_manifest.v1",
  "subject": {
    "git_ref": "feature/agent-checkout",
    "commit": "8fd4...",
    "change_id": "pr-123"
  },
  "agent": {
    "surface": "claude-code",
    "session_ref": "cc-session:sha256:...",
    "role": "implementer"
  },
  "intent": {
    "task_summary": "Add checkout retry guard",
    "acceptance_criteria_refs": ["issue:123#acceptance"]
  },
  "context_authority": [
    {
      "kind": "rule_file",
      "ref": "CLAUDE.md",
      "hash": "sha256:...",
      "authority": "project"
    }
  ],
  "verification": {
    "commands": [
      {
        "cmd": "npm test -- checkout",
        "status": "passed",
        "evidence_ref": "ci:run-456"
      }
    ],
    "not_checked": ["load-test", "payment-provider-sandbox"]
  },
  "git_trailers": {
    "Agent-Session": "cc-session:sha256:...",
    "Agent-Manifest": "agent-change-manifest.json"
  },
  "privacy": {
    "raw_prompt_included": false,
    "raw_transcript_included": false,
    "raw_source_included": false,
    "secrets_included": false
  },
  "stale_if": [
    "commit changes without manifest refresh",
    "context_authority hash changes",
    "verification command or CI run is superseded",
    "target branch moves across touched ownership boundary"
  ]
}
```

## What to put in Git

A practical setup is:

1. Add a commit trailer that points to a stable sidecar, not to raw chat logs.
2. Store the sidecar in a reviewable place such as `.pluribus/agent-change-manifests/<commit>.json`, a PR artifact, or an internal evidence bucket.
3. Require CI/review to fail closed when the manifest says `unsafe_to_resume`, omits required privacy flags, or lists a `stale_if` condition that is already true.

Example trailers:

```text
Agent-Session: claude-code:sha256:5fe0...
Agent-Manifest: .pluribus/agent-change-manifests/8fd4c0e.json
Agent-Verification: npm-test:ci-456
```

The trailer is the pointer. The manifest is the proof object. Raw prompts, transcripts, source files, secrets, and customer data stay out of both.

## Copyable check

```bash
node examples/agent-change-manifest/check-agent-change-manifest.mjs \
  examples/agent-change-manifest/agent-change-manifest.json
```

Expected output:

```text
agent change manifest ok: 2 context refs, 2 commands, 2 not-checked items, verdict reviewable
privacy ok: no raw prompts/transcripts/source/secrets copied
```

## When not to use it

Do not add a manifest for every tiny human edit. Use it when the next reviewer would otherwise ask: what did the agent think it was doing, what context governed the write, and what evidence would let another agent safely continue?
