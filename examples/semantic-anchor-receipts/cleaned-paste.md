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

Most verbose examples were removed, but the API signature, version notes, and security constraint survive.
