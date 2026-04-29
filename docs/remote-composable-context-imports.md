# Remote Composable Context Imports

Status: design note for the next phase of issue #9. Local `# @import ./file.md` support is already shipped; this note scopes the remote-import follow-up before implementation.

## Goals

Remote imports should let teams inherit shared context from GitHub or HTTPS without making Pluribus non-deterministic, credential-leaky, or unsafe in CI.

The design principle is the same as local imports: explicit context inheritance, expanded before project-local context, with local sections still winning.

## Syntax

Keep the existing directive form:

```markdown
# @import <spec>
```

Add remote specs:

```markdown
# @import github:owner/repo/path/to/context.md
# @import github:owner/repo/path/to/context.md@ref
# @import https://example.com/context.md
```

For GitHub imports, `@ref` should support a branch, tag, or commit SHA. Pinned refs are recommended; floating default-branch imports should warn in local/dev use and fail in CI unless explicitly refreshed.

If a GitHub path includes `@`, parse the ref from the rightmost `@`.

## Resolution semantics

- Preserve the current expansion order: imported content expands before the importing file's local content.
- Preserve current duplicate-section behavior: later local sections override earlier imported sections.
- Remote files may contain nested imports, but they must obey the same max depth and safety rules.
- Relative imports inside a GitHub file resolve relative to that file path in the same repo/ref.
- Relative imports inside arbitrary HTTPS files are a non-goal for the first remote MVP.
- Keep the existing max import depth of `5` unless there is strong evidence to change it.

## Auth

- Public GitHub and HTTPS imports should work without auth.
- Private GitHub imports may use an existing environment token such as `GITHUB_TOKEN`.
- Do not support tokens in import specs, CLI flags, lockfiles, cache metadata, logs, dry-run output, or errors.
- Do not support arbitrary custom headers in the MVP.
- Error messages must redact credentials and credential-bearing URLs.

## Lockfile and cache

Add a project lockfile:

```text
pluribus.lock.json
```

Each locked remote import should include:

- normalized import spec
- resolved source URL or GitHub API target
- resolved immutable commit SHA when available
- SHA-256 content digest
- byte size
- fetched timestamp
- content type

Cache downloaded content by digest, for example:

```text
.pluribus/cache/remote/<sha256>.md
```

Default `pluribus sync` should prefer the lockfile/cache for deterministic runs. Network refresh should require an explicit flag such as:

```bash
pluribus sync --update-imports
```

## Deterministic CI

CI/non-interactive runs should be deterministic by default:

- fail if a remote import is unlocked
- fail if required cached content is missing
- fail if an import uses a floating GitHub ref without an explicit update mode
- fail on digest mismatch
- avoid network unless explicitly enabled

Recommended workflow:

1. Developer runs `pluribus sync --update-imports`.
2. Pluribus writes or updates `pluribus.lock.json` and cache entries.
3. Developer commits the lockfile.
4. CI runs `pluribus sync --dry-run` without fetching remote content.

## Network and content limits

Defaults for the MVP:

- HTTPS only; continue rejecting `http://`
- 5s per-request timeout
- 15s total remote resolution budget
- 256 KiB max per remote file
- 1 MiB max merged remote content
- max 3 redirects
- redirects must stay on `https://`
- UTF-8 Markdown text only
- reject binary or non-UTF-8 content
- strip UTF-8 BOM before parsing, matching local import behavior

## Supply-chain safety

- Never execute imported content.
- Never shell out from import resolution.
- Never support post-processing hooks.
- Require digest pinning for deterministic use.
- Fail hard on lockfile digest mismatch.
- Do not allow remote imports to resolve into local filesystem paths.
- Treat remote imports as data, not configuration authority.

## Error model

Keep the current clear failure style from `resolveImports`, but add structured internal error codes for tests and callers:

- `REMOTE_IMPORT_TIMEOUT`
- `REMOTE_IMPORT_TOO_LARGE`
- `REMOTE_IMPORT_AUTH_REQUIRED`
- `REMOTE_IMPORT_LOCK_MISSING`
- `REMOTE_IMPORT_DIGEST_MISMATCH`
- `REMOTE_IMPORT_UNSAFE_REDIRECT`
- `REMOTE_IMPORT_UNSUPPORTED_CONTENT`

User-facing errors should include:

- import spec
- importing file
- import chain
- concise cause

They should never include auth headers, tokens, credential-bearing URLs, or remote body content.

## MVP scope

Ship the first remote MVP only after the local-import behavior remains stable.

In scope:

- `github:owner/repo/path.md[@ref]`
- direct `https://...` Markdown files
- unauthenticated public imports
- optional GitHub auth via `GITHUB_TOKEN`
- lockfile generation/update
- cache by SHA-256 digest
- deterministic CI/offline behavior
- nested GitHub imports within the same repo/ref

Non-goals:

- `http://`
- GitLab/Bitbucket shorthand
- arbitrary request headers
- remote directory imports or globs
- executable imports or hooks
- automatic dependency updates
- relative imports from arbitrary HTTPS documents
- silent network access in deterministic CI mode

## Implementation shape

Keep `resolveImports(sourcePath, options)` as the public entry point, but split resolver internals:

- local resolver: existing filesystem behavior
- GitHub resolver: normalize `github:` specs, fetch content, resolve commit SHA
- HTTPS resolver: fetch Markdown text with timeout and size guards
- lock/cache module: read/write `pluribus.lock.json`, verify digest, read/write cached blobs

Potential options:

```js
resolveImports(sourcePath, {
  allowRemote: false,
  updateImports: false,
  offline: false,
  lockfilePath: 'pluribus.lock.json',
  cacheDir: '.pluribus/cache/remote',
  timeoutMs: 5000,
  maxRemoteBytes: 256 * 1024,
  maxMergedRemoteBytes: 1024 * 1024,
})
```

CLI flags should come after the resolver behavior is covered by tests.

## Test checklist

- parses `github:` imports with and without `@ref`
- rejects `http://`
- redacts auth in errors
- enforces timeout
- enforces per-file and merged-size limits
- rejects unsafe redirects
- writes deterministic lockfile entries
- reads from lock/cache without network in CI/offline mode
- fails on missing lock entry in CI/offline mode
- fails on digest mismatch
- supports nested GitHub imports within the same repo/ref
- rejects unsupported HTTPS-relative nested imports
- preserves local override behavior after remote expansion

## Suggested issue #9 checklist

```markdown
Next phase for #9: remote composable context imports.

- [ ] Specify remote syntax: `github:owner/repo/path.md[@ref]` and `https://...`.
- [ ] Preserve local MVP merge behavior: imports expand before local content; local duplicate sections win.
- [ ] Add `pluribus.lock.json` design with resolved ref/commit, SHA-256 digest, size, fetched timestamp, and content type.
- [ ] Add cache design and explicit `--update-imports` refresh flow.
- [ ] Define CI/offline behavior: fail on unlocked/cache-missing/floating imports unless explicitly updating.
- [ ] Define auth: public unauthenticated fetches plus optional `GITHUB_TOKEN`; never persist or log secrets.
- [ ] Enforce safety limits: HTTPS only, request timeout, max bytes, redirect limit, UTF-8 Markdown only.
- [ ] Define supply-chain protections: digest verification, hard fail on mismatch, no execution/hooks.
- [ ] Add structured remote import errors with import-chain context and secret redaction.
- [ ] MVP: GitHub + direct HTTPS files only.
- [ ] Non-goals: `http://`, arbitrary headers, GitLab/Bitbucket shorthand, directory/glob imports, HTTPS-relative nested imports.
- [ ] Add tests for lockfile determinism, digest mismatch, timeout, size limit, auth redaction, nested remote imports, and CI/offline mode.
```
