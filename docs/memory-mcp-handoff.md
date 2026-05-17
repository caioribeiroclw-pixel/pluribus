# MCP memory handoff with Pluribus

Persistent memory tools and Pluribus solve adjacent problems.

- MCP memory servers keep **durable, queryable memories** across sessions.
- Pluribus keeps **intentional project instructions** in one reviewed source of truth and syncs them into the files each coding tool reads.

The useful overlap is the memory protocol: the small set of rules that tells Claude Code, Cursor, Copilot, OpenClaw, Windsurf, Continue, or Zed when to recall memory, what to store, and what must never be stored.

## Why this matters

Market signal from MemoryGraph, GBrain-style agent brains, and MCP knowledge/memory directories is clear: developers are moving beyond one-off prompt files toward persistent agent memory.

But most memory tools still need per-client setup text such as:

- recall project memories before starting work;
- store decisions after commits, bug fixes, releases, and architecture changes;
- tag memories with project, subsystem, tool, and confidence;
- never store secrets, credentials, private user data, or transient chat noise.

If that protocol is copied separately into `CLAUDE.md`, `.cursorrules`, Copilot instructions, `AGENTS.md`, Windsurf rules, Continue rules, and Zed rules, the protocol itself drifts.

Pluribus can be the narrow static layer above memory: one reviewed `pluribus.md` defines the protocol, then each tool gets the same safety constraints and workflow language in its native context file.

## Try the demo locally

From the repository root:

```bash
cd examples/memory-mcp-handoff
node ../../bin/pluribus.js validate
node ../../bin/pluribus.js sync --dry-run
```

Or from any machine with npm:

```bash
git clone https://github.com/caioribeiroclw-pixel/pluribus.git
cd pluribus/examples/memory-mcp-handoff
npx --yes pluribus-context@latest validate
npx --yes pluribus-context@latest sync --dry-run
```

The dry run shows how one memory protocol would be rendered into tool-specific outputs without writing files.

## What Pluribus should not do

Pluribus should not become a memory database, vector index, graph store, MCP server, or retrieval layer. Those projects already exist and are moving fast.

The stronger positioning is narrower:

> Pluribus is the reviewed, versioned instruction layer that keeps memory protocols and AI coding rules aligned across tools.

If a project only uses one coding tool and one memory server, a hand-written `CLAUDE.md` or agent rule file may be enough. Pluribus becomes useful when the same protocol must stay aligned across multiple tools, repos, or teams.

## Feedback wanted

If you maintain or use an MCP memory/knowledge tool, the open question is:

1. Should the memory protocol live in each tool's native instruction file, or be generated from one source?
2. Which fields matter most: recall timing, storage triggers, tags, privacy constraints, confidence, relationship links, or project boundaries?
3. What would make this demo more useful without turning Pluribus into a memory server?

Use the [review/listing feedback template](https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=review-feedback.yml) or the Pluribus Discussions tab if you have a concrete workflow to test.
