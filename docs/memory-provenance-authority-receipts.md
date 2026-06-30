# Memory provenance + authority-home receipts

Memory servers, GraphRAG layers, and shared context databases are becoming credible agent infrastructure. That is good for recall, but it creates a new boundary problem: a memory hit is not automatically authority.

A Pluribus-style memory provenance receipt answers a narrow question before an agent edits, calls tools, or resumes a handoff:

> Which memory facts crossed the boundary, which authored source made them authoritative, which memory was suppressed as stale/superseded, and what private raw material was intentionally omitted from the receipt?

## When to use it

Use this receipt when an agent loads any of these before action:

- MCP memory server search/load results;
- GraphRAG/vector/code-search results;
- exported project memories during a handover;
- old transcript/session notes;
- generated rules or skills derived from previous runs.

Do **not** use it as a storage format for raw memory. The receipt should be small enough to review in a PR, issue, incident timeline, or handoff packet.

## Minimal fields

```json
{
  "schema": "pluribus.memory_provenance_authority_receipt.v1",
  "authority_homes": [
    {
      "id": "adr-042",
      "kind": "adr",
      "path_hash": "sha256:...",
      "git_ref": "main@9c4e2b1",
      "role": "current_database_decision"
    }
  ],
  "memory_events": [
    {
      "id": "mem-17",
      "operation": "search",
      "source_hash": "sha256:...",
      "claim": "provider v3 removed legacy retry semantics",
      "freshness": "current",
      "authority_home": "release-2026-06-28",
      "used_as_authority": true,
      "verification_path": "release note -> provider changelog -> smoke checkout test"
    },
    {
      "id": "mem-03",
      "operation": "load",
      "claim": "SQLite remains the production database",
      "freshness": "superseded",
      "superseded_by": "adr-042",
      "used_as_authority": false,
      "suppressed_reason": "old transcript note conflicts with current ADR"
    }
  ],
  "privacy_omissions": [
    {
      "category": "raw_memory_text",
      "count": 2,
      "reason": "receipt keeps hashes and claims, not private notes"
    }
  ]
}
```

The important distinction is `authority_home`: a memory item may be useful, but an authored/reviewable source should own the decision whenever the agent uses that fact as authority.

## Try the demo

```bash
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus/examples/memory-provenance-authority-receipts
node check-memory-provenance-receipt.mjs safe-memory-provenance-receipt.json
node check-memory-provenance-receipt.mjs unsafe-memory-provenance-receipt.json
```

The unsafe sample fails because it lets a superseded memory item govern an edit and omits the provenance/privacy evidence a reviewer needs.
