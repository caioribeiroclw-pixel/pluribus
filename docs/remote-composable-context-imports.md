# Remote Composable Context Imports

Status: remote MVP implemented for explicit `github:`/`https://` fetches, lock/cache offline reuse, and optional GitHub auth for private imports. Remaining design work: CI/cache policy ergonomics and deeper structured error context.

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

- Public GitHub and HTTPS imports work without auth.
- Private GitHub imports may use existing credentials only during `pluribus sync --update-imports`.
- Credential lookup order: `GH_TOKEN`, then `GITHUB_TOKEN`, then an existing GitHub CLI login via `gh auth token`.
- Do not support inline tokens, token CLI flags, lockfile/cache auth metadata, or arbitrary custom headers in the MVP.
- Do not store tokens in `pluribus.lock.json` or `.pluribus/cache/remote/`; the lockfile is safe to commit and the cache is local/regenerable.
- Error messages must redact credentials, credential-bearing URLs, and known token values.

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
- Never shell out based on imported content or import specs; the only subprocess is the fixed optional `gh auth token` credential lookup when env tokens are absent.
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

Shipped in the first remote MVP:

- `github:owner/repo/path.md[@ref]`
- direct `https://...` Markdown/text files
- unauthenticated public imports
- optional private GitHub imports via `GH_TOKEN`/`GITHUB_TOKEN` or logged-in `gh`
- explicit `pluribus sync --update-imports` network access
- lockfile generation/update and cache by SHA-256 digest
- deterministic offline lock/cache reuse with digest verification
- timeout, redirect, content-type, UTF-8, per-file size, and merged-size guards
- credential-bearing URL rejection/redaction
- nested GitHub imports within the same repo/ref

Still pending for the hardening phase:

- CI/cache policy ergonomics
- immutable GitHub commit resolution metadata
- richer import-chain context in structured errors

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

Current implementation keeps `resolveImports(sourcePath, options)` as the synchronous local-only entry point and adds `resolveImportsAsync(sourcePath, { allowRemote })` for explicit remote resolution:

- local resolver: existing filesystem behavior
- GitHub resolver: normalize `github:` specs and fetch raw content, optionally with existing GitHub auth
- HTTPS resolver: fetch Markdown/text with timeout and size guards
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

CLI flag shipped: `pluribus sync --update-imports` enables remote network fetches. Without that flag, remote directives fail clearly instead of doing silent network access.

## Test checklist

- [x] parses `github:` imports with `@ref`
- [x] rejects `http://`
- [x] redacts auth in errors
- [x] enforces timeout
- [x] enforces per-file and merged-size limits
- [x] rejects unsafe redirects
- [x] writes deterministic lockfile entries
- [x] reads from lock/cache without network in CI/offline mode
- [x] fails on missing lock entry in CI/offline mode
- [x] fails on digest mismatch
- [x] supports nested GitHub imports within the same repo/ref
- [x] rejects unsupported HTTPS-relative nested imports
- [x] preserves local override behavior after remote expansion

## Suggested issue #9 checklist

```markdown
Next phase for #9: harden remote composable context imports.

- [x] Specify remote syntax: `github:owner/repo/path.md[@ref]` and `https://...`.
- [x] Preserve local MVP merge behavior: imports expand before local content; local duplicate sections win.
- [x] Add `pluribus.lock.json` design with SHA-256 digest, size, fetched timestamp, and content type. Resolved commit metadata remains pending.
- [x] Add cache design around the explicit `--update-imports` refresh flow.
- [x] Define CI/offline behavior: fail on unlocked/cache-missing imports unless explicitly updating. Floating ref policy remains pending.
- [x] Define auth: public unauthenticated fetches plus optional existing `GH_TOKEN`/`GITHUB_TOKEN` or logged-in `gh`; never persist or log secrets.
- [x] Enforce safety limits: HTTPS only, request timeout, max bytes, redirect limit, UTF-8 Markdown only.
- [x] Define supply-chain protections: digest verification, hard fail on mismatch, no execution/hooks.
- [ ] Add structured remote import errors with import-chain context and broader secret redaction.
- [x] MVP: GitHub + direct HTTPS files only.
- [x] Non-goals: `http://`, arbitrary headers, GitLab/Bitbucket shorthand, directory/glob imports, HTTPS-relative nested imports.
- [ ] Add tests for lockfile determinism, digest mismatch, and CI/offline mode.
```
