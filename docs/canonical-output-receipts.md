# Canonical output receipts

Claude Projects, long Claude Code sessions, and other agent workspaces are useful archives, but search is a weak source of truth. Exact phrases can be hard to recover, project-scoped search may miss the last clean version, and a later chat can overwrite the user's memory of which artifact is authoritative.

Use a canonical output receipt when a session produces something that should be found and reused later: a master prompt, escalation memo, architecture decision, migration plan, test matrix, runbook, product brief, or reviewed context file.

The receipt is not persistent memory and not a transcript dump. It is a small index card for the last clean artifact: stable id/path, version, exact grep phrases, decisions, rejected alternatives, open questions, and next action — without logging raw private content, secrets, customer data, or full chat history.

## When this helps

Use this receipt when:

- a Claude Project or long chat produces a canonical artifact that must survive fuzzy chat search;
- several sessions produce competing versions and a reviewer needs the current one;
- the source chat may be compacted, archived, deleted, exported, or hard to search;
- a team needs to know which artifact should be copied into repo docs, `pluribus.md`, `CLAUDE.md`, `AGENTS.md`, a prompt library, or a ticket;
- exact phrases, dates, decisions, and rejected options matter more than the full conversation.

## Receipt shape

Attach this to the artifact, repo issue, PR body, project notes, or a `canonical_outputs.md` index.

```json
{
  "type": "canonical.output.receipt.v1",
  "artifact": {
    "stable_id": "project-alpha-master-prompt-2026-05-30",
    "name": "Project Alpha master prompt",
    "kind": "master_prompt",
    "canonical_path": "docs/prompts/project-alpha-master-prompt.md",
    "current_version": "2026-05-30.1",
    "content_hash": "sha256:example-only",
    "status": "current",
    "owner_label": "product-ops",
    "created_at": "2026-05-30T21:40:00Z",
    "last_reviewed_at": "2026-05-30T21:58:00Z"
  },
  "source": {
    "workspace": "claude-project-alpha",
    "source_session_id": "session-redacted-2026-05-30",
    "source_tool": "claude-projects",
    "source_chat_title": "Master prompt rebuild",
    "source_url_or_path_redacted": true,
    "raw_transcript_logged": false
  },
  "index": {
    "exact_phrases_worth_grepping": [
      "do not collapse escalation paths into summaries",
      "billing exports are evidence, not source of truth",
      "final prompt contract v3"
    ],
    "tags": ["master-prompt", "billing", "escalation", "current-state"],
    "related_artifacts": ["billing-escalation-runbook-2026-05-28"]
  },
  "decisions": {
    "accepted": [
      "Use repo-owned markdown as the canonical copy, not old chats",
      "Keep escalation criteria in the prompt body and test cases in a separate appendix"
    ],
    "rejected": [
      {
        "option": "Rely on Claude Project conversation search for recovery",
        "reason": "exact phrase and project-scoped search were unreliable during rebuild"
      }
    ],
    "open_questions": [
      "Does support need a shorter handoff summary for weekend rotations?"
    ],
    "next_action": "Open a PR that adds the canonical prompt and this receipt to docs/prompts/"
  },
  "privacy": {
    "raw_prompt_logged": false,
    "raw_chat_logged": false,
    "customer_data_logged": false,
    "secrets_logged": false,
    "proprietary_paths_logged": false
  }
}
```

## Minimal checklist

Before treating an artifact as recoverable, capture:

- stable id, human name, artifact kind, canonical path, version/date, owner label, status, and content hash;
- source workspace/tool/session label, with private URLs or IDs redacted when needed;
- exact phrases worth grepping, tags, and related artifacts;
- decisions accepted, options rejected with reasons, open questions, and next action;
- privacy flags proving raw chats, raw prompts, customer data, secrets, and private paths were not logged.

## `canonical_outputs.md` sketch

For small teams, a plain markdown index is enough:

```markdown
# Canonical outputs

| Stable ID | Current path | Version | Status | Exact phrase to grep | Next action |
| --- | --- | --- | --- | --- | --- |
| project-alpha-master-prompt-2026-05-30 | docs/prompts/project-alpha-master-prompt.md | 2026-05-30.1 | current | final prompt contract v3 | PR canonical copy |
```

Old chats should be evidence. The source of truth should be the artifact plus the receipt.

## What not to log

Do not include raw chat transcripts, full prompts that contain private context, customer data, secrets, credentials, exact private paths, proprietary document bodies, or unredacted project URLs. Prefer hashes, stable ids, coarse tags, short grep phrases, version dates, and decision states.
