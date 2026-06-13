# Upload API v2 migration notes

The `uploadFile` helper changed in v2.4.0. Keep this version note because older snippets still use v1.

```ts
export async function uploadFile(input: UploadInput): Promise<UploadResult> {
  return client.files.upload(input)
}
```

## Required behavior

- Preserve the retry policy: max 3 attempts with exponential backoff.
- Do not strip the security constraint: never log raw file contents.
- Deprecated: `uploadLegacy(path)` is removed after v2.5.0.

Most examples below are verbose and can be compressed before pasting into Claude Code once the important anchors are checked.

Long example narrative: in staging we saw several users retry uploads manually after a network timeout, then paste screenshots and unrelated logs into the issue. The cleaned context does not need every anecdote, every repeated stack frame, or every copy of the same explanatory paragraph. It only needs enough surrounding language for the agent to understand the migration target after the anchors above are preserved. Remove repeated examples, duplicated support notes, and verbose operational chatter before the paste enters the session.
