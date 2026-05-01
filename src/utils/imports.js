/**
 * Import resolver for pluribus.md files.
 *
 * Supports directives like:
 *   # @import ./shared/base-context.md
 *
 * Local imports remain synchronous and deterministic by default. Remote imports are
 * available only through resolveImportsAsync(..., { allowRemote: true }) so normal
 * sync runs never perform silent network access.
 */

import * as childProcess from 'child_process'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const IMPORT_DIRECTIVE_RE = /^#\s+@import\s+(.+?)\s*$/
const REMOTE_IMPORT_RE = /^(?:https?:\/\/|github:)/i
const HTTPS_IMPORT_RE = /^https:\/\//i
const HTTP_IMPORT_RE = /^http:\/\//i
const GITHUB_IMPORT_RE = /^github:/i
const DEFAULT_MAX_DEPTH = 5
const DEFAULT_TIMEOUT_MS = 5000
const DEFAULT_MAX_REMOTE_BYTES = 256 * 1024
const DEFAULT_MAX_MERGED_REMOTE_BYTES = 1024 * 1024
const DEFAULT_MAX_REDIRECTS = 3

/**
 * @typedef {object} ResolvedImport
 * @property {string} from Absolute local path or remote resource id of the importing file
 * @property {string} to Absolute local path or remote resource id of the imported file
 * @property {string} spec Raw import spec from the directive
 */

/**
 * @typedef {object} ResolveImportsOptions
 * @property {string} [rootDir] Directory local imports must stay inside. Defaults to source file directory.
 * @property {number} [maxDepth] Maximum recursive import depth. Defaults to 5.
 * @property {boolean} [allowRemote] Enable remote imports. Sync resolver defaults to false.
 * @property {(url: string, init?: object) => Promise<Response>} [fetchImpl] Test seam / custom fetch implementation.
 * @property {number} [timeoutMs] Per-request timeout for remote imports. Defaults to 5000.
 * @property {number} [maxRemoteBytes] Maximum bytes per remote document. Defaults to 256 KiB.
 * @property {number} [maxMergedRemoteBytes] Maximum total remote bytes in one resolution. Defaults to 1 MiB.
 * @property {number} [maxRedirects] Maximum HTTPS redirects. Defaults to 3.
 * @property {string} [lockfilePath] Project remote import lockfile path.
 * @property {string} [cacheDir] Directory for digest-addressed remote import cache entries.
 * @property {boolean} [updateLockfile] Write fetched remote imports into lockfile/cache.
 * @property {(file: string, args: string[], options: object, callback: Function) => void} [execFileImpl] Test seam for GitHub CLI token lookup.
 */

/**
 * Resolve and expand local # @import directives synchronously.
 * Imported content is emitted before the importing file's own content so later
 * local sections win with the existing parser's duplicate-section behavior.
 *
 * Remote imports intentionally require resolveImportsAsync with allowRemote=true.
 *
 * @param {string} sourcePath Path to the root pluribus.md file.
 * @param {ResolveImportsOptions} [options]
 * @returns {{ content: string, imports: ResolvedImport[] }}
 */
export function resolveImports(sourcePath, options = {}) {
  const ctx = createContext(sourcePath, options, false)
  const content = resolveLocalFileSync(createLocalResource(ctx.absoluteSource), ctx)
  return { content, imports: ctx.imports }
}

/**
 * Resolve and expand # @import directives asynchronously.
 * Local behavior matches resolveImports. Remote github:/https:// imports are only
 * resolved when allowRemote is true, making network use explicit.
 *
 * @param {string} sourcePath Path to the root pluribus.md file.
 * @param {ResolveImportsOptions} [options]
 * @returns {Promise<{ content: string, imports: ResolvedImport[] }>}
 */
export async function resolveImportsAsync(sourcePath, options = {}) {
  const ctx = createContext(sourcePath, options, Boolean(options.allowRemote))
  const content = await resolveResource(createLocalResource(ctx.absoluteSource), ctx)
  return { content, imports: ctx.imports }
}

/**
 * @param {string} sourcePath
 * @param {ResolveImportsOptions} options
 * @param {boolean} asyncMode
 */
function createContext(sourcePath, options, asyncMode) {
  const absoluteSource = path.resolve(sourcePath)
  return {
    absoluteSource,
    rootDir: path.resolve(options.rootDir || path.dirname(absoluteSource)),
    maxDepth: Number.isInteger(options.maxDepth) ? options.maxDepth : DEFAULT_MAX_DEPTH,
    allowRemote: Boolean(options.allowRemote),
    asyncMode,
    fetchImpl: options.fetchImpl || globalThis.fetch,
    timeoutMs: Number.isInteger(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS,
    maxRemoteBytes: Number.isInteger(options.maxRemoteBytes) ? options.maxRemoteBytes : DEFAULT_MAX_REMOTE_BYTES,
    maxMergedRemoteBytes: Number.isInteger(options.maxMergedRemoteBytes) ? options.maxMergedRemoteBytes : DEFAULT_MAX_MERGED_REMOTE_BYTES,
    maxRedirects: Number.isInteger(options.maxRedirects) ? options.maxRedirects : DEFAULT_MAX_REDIRECTS,
    lockfilePath: options.lockfilePath ? path.resolve(options.lockfilePath) : null,
    cacheDir: options.cacheDir ? path.resolve(options.cacheDir) : null,
    updateLockfile: Boolean(options.updateLockfile),
    depth: 0,
    stack: [],
    imports: [],
    remoteState: { bytes: 0 },
    githubAuth: { resolved: false, token: null },
    execFileImpl: options.execFileImpl || childProcess.execFile,
    lockfile: options.lockfilePath ? readRemoteLockfile(path.resolve(options.lockfilePath)) : null,
  }
}

function createLocalResource(filePath) {
  const absolutePath = path.resolve(filePath)
  return {
    kind: 'local',
    id: absolutePath,
    display: formatPath(absolutePath),
    dir: path.dirname(absolutePath),
  }
}

/**
 * @param {{ kind: string, id: string, display: string, dir?: string }} resource
 * @param {ReturnType<typeof createContext>} ctx
 * @returns {string}
 */
function resolveLocalFileSync(resource, ctx) {
  if (resource.kind !== 'local') {
    throw new Error(`Remote imports require resolveImportsAsync(..., { allowRemote: true }): ${resource.display}`)
  }

  const rawContent = readLocalFile(resource, ctx)
  return resolveContentSync(rawContent, resource, ctx)
}

/**
 * @param {{ kind: string, id: string, display: string, dir?: string, github?: object }} resource
 * @param {ReturnType<typeof createContext>} ctx
 * @returns {Promise<string>}
 */
async function resolveResource(resource, ctx) {
  let rawContent
  if (resource.kind === 'local') {
    rawContent = readLocalFile(resource, ctx)
  } else {
    rawContent = await readRemoteResource(resource, ctx)
  }

  return resolveContentAsync(rawContent, resource, ctx)
}

function readLocalFile(resource, ctx) {
  assertInsideRoot(resource.id, ctx.rootDir, `Import escapes project root: ${formatPath(resource.id)} is outside ${formatPath(ctx.rootDir)}`)

  if (ctx.stack.includes(resource.id)) {
    const cycle = [...ctx.stack, resource.id].map(formatImportId).join(' -> ')
    throw new Error(`Import cycle detected: ${cycle}`)
  }

  if (!fs.existsSync(resource.id)) {
    throw new Error(`Imported file not found: ${formatPath(resource.id)}`)
  }

  try {
    return fs.readFileSync(resource.id, 'utf8')
  } catch (err) {
    throw new Error(`Could not read imported file ${formatPath(resource.id)}: ${err.message}`)
  }
}

function resolveContentSync(rawContent, resource, ctx) {
  const nextStack = [...ctx.stack, resource.id]
  const importedChunks = []
  const localLines = []
  const cleanedContent = rawContent.replace(/^\uFEFF/, '')

  for (const line of cleanedContent.split(/\r?\n/)) {
    const match = line.match(IMPORT_DIRECTIVE_RE)
    if (!match) {
      localLines.push(line)
      continue
    }

    const spec = normalizeImportSpec(match[1])
    if (REMOTE_IMPORT_RE.test(spec)) {
      throw new Error(`Remote imports are not enabled: ${redactImportSpec(spec)}. Use resolveImportsAsync(..., { allowRemote: true }) or pluribus sync --update-imports.`)
    }

    const nextDepth = ctx.depth + 1
    assertDepth(nextDepth, ctx.maxDepth, spec, resource.display)

    const target = resolveLocalImport(spec, resource)
    ctx.imports.push({ from: resource.id, to: target.id, spec })
    importedChunks.push(resolveLocalFileSync(target, {
      ...ctx,
      depth: nextDepth,
      stack: nextStack,
    }))
  }

  return joinChunks(importedChunks, localLines)
}

async function resolveContentAsync(rawContent, resource, ctx) {
  if (ctx.stack.includes(resource.id)) {
    const cycle = [...ctx.stack, resource.id].map(formatImportId).join(' -> ')
    throw new Error(`Import cycle detected: ${cycle}`)
  }

  const nextStack = [...ctx.stack, resource.id]
  const importedChunks = []
  const localLines = []
  const cleanedContent = rawContent.replace(/^\uFEFF/, '')

  for (const line of cleanedContent.split(/\r?\n/)) {
    const match = line.match(IMPORT_DIRECTIVE_RE)
    if (!match) {
      localLines.push(line)
      continue
    }

    const spec = normalizeImportSpec(match[1])
    const nextDepth = ctx.depth + 1
    assertDepth(nextDepth, ctx.maxDepth, spec, resource.display)

    const target = resolveImportSpec(spec, resource, ctx)
    ctx.imports.push({ from: resource.id, to: target.id, spec })
    importedChunks.push(await resolveResource(target, {
      ...ctx,
      depth: nextDepth,
      stack: nextStack,
    }))
  }

  return joinChunks(importedChunks, localLines)
}

function resolveImportSpec(spec, importer, ctx) {
  if (HTTP_IMPORT_RE.test(spec)) {
    throw new Error(`Remote imports require https://, not http://: ${redactImportSpec(spec)}`)
  }

  if (GITHUB_IMPORT_RE.test(spec)) {
    return createGithubResource(spec)
  }

  if (HTTPS_IMPORT_RE.test(spec)) {
    return createHttpsResource(spec)
  }

  if (importer.kind === 'github') {
    return createGithubRelativeResource(spec, importer)
  }

  if (importer.kind === 'https') {
    throw new Error(`Relative imports from HTTPS documents are not supported in the remote MVP: ${spec}`)
  }

  return resolveLocalImport(spec, importer)
}

function resolveLocalImport(spec, importer) {
  const targetPath = path.resolve(importer.dir, spec)
  return createLocalResource(targetPath)
}

function createHttpsResource(spec) {
  let url
  try {
    url = new URL(spec)
  } catch {
    throw new Error(`Invalid HTTPS import URL: ${redactImportSpec(spec)}`)
  }

  if (url.protocol !== 'https:') {
    throw new Error(`Remote imports require https://, not ${url.protocol}: ${redactImportSpec(spec)}`)
  }

  if (url.username || url.password) {
    throw new Error('Credential-bearing HTTPS import URLs are not supported')
  }

  return {
    kind: 'https',
    id: url.toString(),
    display: url.toString(),
    url: url.toString(),
  }
}

function createGithubResource(spec) {
  const parsed = parseGithubSpec(spec)
  return githubResourceFromParts(parsed.owner, parsed.repo, parsed.filePath, parsed.ref)
}

function createGithubRelativeResource(spec, importer) {
  const normalized = path.posix.normalize(path.posix.join(path.posix.dirname(importer.github.filePath), spec))
  if (normalized.startsWith('../') || normalized === '..') {
    throw new Error(`GitHub relative import escapes repository path scope: ${spec}`)
  }
  return githubResourceFromParts(importer.github.owner, importer.github.repo, normalized, importer.github.ref)
}

function githubResourceFromParts(owner, repo, filePath, ref) {
  const rawUrl = buildGithubRawUrl(owner, repo, ref, filePath)
  const display = `github:${owner}/${repo}/${filePath}${ref ? `@${ref}` : ''}`
  return {
    kind: 'github',
    id: display,
    display,
    url: rawUrl,
    github: { owner, repo, filePath, ref },
  }
}

function parseGithubSpec(spec) {
  const body = spec.replace(/^github:/i, '').trim()
  const firstSlash = body.indexOf('/')
  const secondSlash = firstSlash >= 0 ? body.indexOf('/', firstSlash + 1) : -1
  if (firstSlash <= 0 || secondSlash <= firstSlash + 1 || secondSlash === body.length - 1) {
    throw new Error(`Invalid GitHub import spec: ${redactImportSpec(spec)}`)
  }

  const owner = body.slice(0, firstSlash)
  const repo = body.slice(firstSlash + 1, secondSlash)
  let filePath = body.slice(secondSlash + 1)
  let ref = null
  const atIndex = filePath.lastIndexOf('@')
  if (atIndex > 0 && atIndex < filePath.length - 1) {
    ref = filePath.slice(atIndex + 1)
    filePath = filePath.slice(0, atIndex)
  }

  if (!owner || !repo || !filePath || filePath.startsWith('/')) {
    throw new Error(`Invalid GitHub import spec: ${redactImportSpec(spec)}`)
  }

  const normalizedPath = path.posix.normalize(filePath)
  if (normalizedPath.startsWith('../') || normalizedPath === '..') {
    throw new Error(`GitHub import path escapes repository: ${redactImportSpec(spec)}`)
  }

  return { owner, repo, filePath: normalizedPath, ref }
}

function buildGithubRawUrl(owner, repo, ref, filePath) {
  const safe = [owner, repo, ref || 'HEAD', ...filePath.split('/')]
    .map((part) => encodeURIComponent(part))
    .join('/')
  return `https://raw.githubusercontent.com/${safe}`
}

async function readRemoteResource(resource, ctx) {
  if (!ctx.allowRemote) {
    const cachedText = readLockedRemoteText(resource, ctx)
    if (cachedText !== null) return cachedText

    if (ctx.lockfilePath) {
      throw remoteError('REMOTE_IMPORT_UNLOCKED', `Remote import is not locked or cached: ${resource.display}. Run pluribus sync --update-imports to refresh pluribus.lock.json.`)
    }

    throw new Error(`Remote imports are not enabled: ${resource.display}`)
  }

  if (typeof ctx.fetchImpl !== 'function') {
    throw new Error('Remote imports require a fetch implementation')
  }

  const fetched = await fetchRemoteText(resource, ctx)
  writeLockedRemoteText(resource, fetched, ctx)
  return fetched.text
}

async function fetchRemoteText(resource, ctx) {
  let url = resource.url
  const githubToken = resource.kind === 'github' ? await getGithubAuthToken(ctx) : null
  for (let redirectCount = 0; redirectCount <= ctx.maxRedirects; redirectCount++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), ctx.timeoutMs)
    let response
    try {
      response = await ctx.fetchImpl(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: remoteFetchHeaders(resource, url, githubToken),
      })
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw remoteError('REMOTE_IMPORT_TIMEOUT', `Remote import timed out after ${ctx.timeoutMs}ms: ${resource.display}`)
      }
      throw new Error(`Could not fetch remote import ${resource.display}: ${redactSecrets(err.message || String(err), ctx)}`)
    } finally {
      clearTimeout(timeout)
    }

    if (isRedirect(response.status)) {
      const location = response.headers.get('location')
      if (!location) {
        throw remoteError('REMOTE_IMPORT_UNSAFE_REDIRECT', `Remote import redirect missing Location: ${resource.display}`)
      }
      const nextUrl = new URL(location, url)
      if (nextUrl.protocol !== 'https:') {
        throw remoteError('REMOTE_IMPORT_UNSAFE_REDIRECT', `Remote import redirected outside https://: ${resource.display}`)
      }
      if (nextUrl.username || nextUrl.password) {
        throw remoteError('REMOTE_IMPORT_UNSAFE_REDIRECT', `Remote import redirected to a credential-bearing URL: ${resource.display}`)
      }
      url = nextUrl.toString()
      continue
    }

    if (!response.ok) {
      throw new Error(`Remote import failed (${response.status}) for ${resource.display}`)
    }

    const lengthHeader = response.headers.get('content-length')
    if (lengthHeader && Number(lengthHeader) > ctx.maxRemoteBytes) {
      throw remoteError('REMOTE_IMPORT_TOO_LARGE', `Remote import exceeds ${ctx.maxRemoteBytes} bytes: ${resource.display}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!isSupportedTextContentType(contentType)) {
      throw remoteError('REMOTE_IMPORT_UNSUPPORTED_CONTENT', `Remote import is not UTF-8 Markdown/text: ${resource.display}`)
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > ctx.maxRemoteBytes) {
      throw remoteError('REMOTE_IMPORT_TOO_LARGE', `Remote import exceeds ${ctx.maxRemoteBytes} bytes: ${resource.display}`)
    }

    ctx.remoteState.bytes += bytes.byteLength
    if (ctx.remoteState.bytes > ctx.maxMergedRemoteBytes) {
      throw remoteError('REMOTE_IMPORT_TOO_LARGE', `Merged remote imports exceed ${ctx.maxMergedRemoteBytes} bytes`)
    }

    try {
      return {
        text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
        bytes,
        byteLength: bytes.byteLength,
        contentType,
      }
    } catch {
      throw remoteError('REMOTE_IMPORT_UNSUPPORTED_CONTENT', `Remote import is not valid UTF-8: ${resource.display}`)
    }
  }

  throw remoteError('REMOTE_IMPORT_UNSAFE_REDIRECT', `Remote import exceeded ${ctx.maxRedirects} redirects: ${resource.display}`)
}

function remoteFetchHeaders(resource, url, githubToken) {
  const headers = {
    Accept: 'text/markdown,text/plain;q=0.9,*/*;q=0.1',
    'User-Agent': 'pluribus-remote-imports',
  }

  if (resource.kind === 'github' && githubToken && isGithubRawUrl(url)) {
    headers.Authorization = `Bearer ${githubToken}`
  }

  return headers
}

async function getGithubAuthToken(ctx) {
  if (ctx.githubAuth.resolved) return ctx.githubAuth.token

  ctx.githubAuth.resolved = true
  ctx.githubAuth.token = getEnvGithubToken() || await getGithubCliToken(ctx)
  return ctx.githubAuth.token
}

function getEnvGithubToken() {
  return firstNonEmpty(process.env.GH_TOKEN, process.env.GITHUB_TOKEN)
}

async function getGithubCliToken(ctx) {
  if (typeof ctx.execFileImpl !== 'function') return null

  return new Promise((resolve) => {
    try {
      ctx.execFileImpl('gh', ['auth', 'token'], {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true,
      }, (err, stdout) => {
        if (err) {
          resolve(null)
          return
        }
        resolve(firstNonEmpty(stdout))
      })
    } catch {
      resolve(null)
    }
  })
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return null
}

function isGithubRawUrl(candidate) {
  try {
    const url = new URL(candidate)
    return url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com'
  } catch {
    return false
  }
}

function readRemoteLockfile(lockfilePath) {
  if (!fs.existsSync(lockfilePath)) {
    return { version: 1, remoteImports: {} }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'))
    if (parsed?.version !== 1 || typeof parsed.remoteImports !== 'object' || parsed.remoteImports === null) {
      throw new Error('expected version 1 with remoteImports object')
    }
    return parsed
  } catch (err) {
    throw new Error(`Could not read remote import lockfile ${formatPath(lockfilePath)}: ${err.message}`)
  }
}

function readLockedRemoteText(resource, ctx) {
  if (!ctx.lockfilePath || !ctx.cacheDir || !ctx.lockfile) return null

  const entry = ctx.lockfile.remoteImports[resource.id]
  if (!entry) return null

  const digestHex = parseSha256Digest(entry.digest)
  if (!digestHex) {
    throw remoteError('REMOTE_IMPORT_DIGEST_MISMATCH', `Remote import lock entry has invalid digest for ${resource.display}`)
  }

  const cachePath = path.join(ctx.cacheDir, `${digestHex}.md`)
  if (!fs.existsSync(cachePath)) return null

  const bytes = fs.readFileSync(cachePath)
  const actualDigest = sha256Digest(bytes)
  if (actualDigest !== entry.digest) {
    throw remoteError('REMOTE_IMPORT_DIGEST_MISMATCH', `Remote import cache digest mismatch for ${resource.display}`)
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw remoteError('REMOTE_IMPORT_UNSUPPORTED_CONTENT', `Cached remote import is not valid UTF-8: ${resource.display}`)
  }
}

function writeLockedRemoteText(resource, fetched, ctx) {
  if (!ctx.updateLockfile || !ctx.lockfilePath || !ctx.cacheDir || !ctx.lockfile) return

  const digest = sha256Digest(fetched.bytes)
  fs.mkdirSync(ctx.cacheDir, { recursive: true })
  fs.writeFileSync(path.join(ctx.cacheDir, `${parseSha256Digest(digest)}.md`), fetched.bytes)

  ctx.lockfile.remoteImports[resource.id] = {
    spec: resource.display,
    url: resource.url,
    digest,
    bytes: fetched.byteLength,
    contentType: fetched.contentType || null,
    fetchedAt: new Date().toISOString(),
  }
  writeRemoteLockfile(ctx.lockfilePath, ctx.lockfile)
}

function writeRemoteLockfile(lockfilePath, lockfile) {
  const sortedEntries = Object.fromEntries(
    Object.entries(lockfile.remoteImports).sort(([a], [b]) => a.localeCompare(b))
  )
  const normalized = {
    version: 1,
    remoteImports: sortedEntries,
  }

  fs.mkdirSync(path.dirname(lockfilePath), { recursive: true })
  fs.writeFileSync(lockfilePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
}

function sha256Digest(bytes) {
  return `sha256-${crypto.createHash('sha256').update(bytes).digest('hex')}`
}

function parseSha256Digest(digest) {
  if (typeof digest !== 'string') return null
  const match = digest.match(/^sha256-([a-f0-9]{64})$/)
  return match ? match[1] : null
}

function isRedirect(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

function isSupportedTextContentType(contentType) {
  if (!contentType) return true
  const lower = contentType.toLowerCase()
  return lower.includes('text/') || lower.includes('markdown') || lower.includes('application/octet-stream')
}

function remoteError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

function assertDepth(nextDepth, maxDepth, spec, importerDisplay) {
  if (nextDepth > maxDepth) {
    throw new Error(`Maximum import depth exceeded (${maxDepth}) while importing ${redactImportSpec(spec)} from ${importerDisplay}`)
  }
}

function joinChunks(importedChunks, localLines) {
  return [...importedChunks, localLines.join('\n')]
    .filter((chunk) => chunk.length > 0)
    .join('\n\n')
}

/**
 * @param {string} spec
 * @returns {string}
 */
function normalizeImportSpec(spec) {
  const trimmed = spec.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

/**
 * @param {string} candidate
 * @param {string} rootDir
 * @param {string} message
 */
function assertInsideRoot(candidate, rootDir, message) {
  const relative = path.relative(rootDir, candidate)
  const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
  if (!isInside) {
    throw new Error(message)
  }
}

function redactImportSpec(spec) {
  if (!/^https?:\/\//i.test(spec)) return spec
  try {
    const url = new URL(spec)
    if (url.username) url.username = 'REDACTED'
    if (url.password) url.password = 'REDACTED'
    return url.toString()
  } catch {
    return spec.replace(/:\/\/([^:@/]+):([^@/]+)@/, '://REDACTED:REDACTED@')
  }
}

function redactSecrets(text, ctx) {
  let redacted = String(text)
  const candidates = [ctx.githubAuth?.token, process.env.GH_TOKEN, process.env.GITHUB_TOKEN]
  for (const secret of candidates) {
    if (typeof secret !== 'string' || secret.length === 0) continue
    redacted = redacted.split(secret).join('REDACTED')
  }
  return redacted
}

function formatImportId(id) {
  return path.isAbsolute(id) ? formatPath(id) : id
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function formatPath(filePath) {
  return path.normalize(filePath)
}
