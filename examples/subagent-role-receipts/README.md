# Subagent role receipts example

This directory contains a small `agents.toml` example for teams experimenting with project-local subagent roles.

The important artifact is not the exact TOML dialect. The important artifact is the receipt that proves the role boundary:

- requested role vs effective role;
- role source and coarse hash/version;
- whether role instructions loaded;
- allowed/refused write and tool capabilities;
- boundary decisions made by the role;
- where the role stopped and the next safe action;
- privacy flags excluding raw prompts, code, transcripts, secrets, customer data, and raw tool output.

See [`../../docs/subagent-role-receipts.md`](../../docs/subagent-role-receipts.md) for the full recipe.
