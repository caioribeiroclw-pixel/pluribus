/**
 * Local import resolver for pluribus.md files.
 *
 * Supports directives like:
 *   # @import ./shared/base-context.md
 *
 * MVP scope is intentionally local-only: no URL/GitHub imports, no shelling out,
 * and no filesystem access outside the root pluribus project directory.
 */

import * as fs from 'fs'
import * as path from 'path'

const IMPORT_DIRECTIVE_RE = /^#\s+@import\s+(.+?)\s*$/
const REMOTE_IMPORT_RE = /^(?:https?:\/\/|github:)/i

/**
 * @typedef {object} ResolvedImport
 * @property {string} from Absolute path of the importing file
 * @property {string} to Absolute path of the imported file
 * @property {string} spec Raw import spec from the directive
 */

/**
 * @typedef {object} ResolveImportsOptions
 * @property {string} [rootDir] Directory imports must stay inside. Defaults to source file directory.
 * @property {number} [maxDepth] Maximum recursive import depth. Defaults to 5.
 */

/**
 * Resolve and expand local # @import directives.
 * Imported content is emitted before the importing file's own content so later
 * local sections win with the existing parser's duplicate-section behavior.
 *
 * @param {string} sourcePath Path to the root pluribus.md file.
 * @param {ResolveImportsOptions} [options]
 * @returns {{ content: string, imports: ResolvedImport[] }}
 */
export function resolveImports(sourcePath, options = {}) {
  const absoluteSource = path.resolve(sourcePath)
  const rootDir = path.resolve(options.rootDir || path.dirname(absoluteSource))
  const maxDepth = Number.isInteger(options.maxDepth) ? options.maxDepth : 5
  const imports = []

  const content = resolveFile(absoluteSource, {
    rootDir,
    maxDepth,
    depth: 0,
    stack: [],
    imports,
  })

  return { content, imports }
}

/**
 * @param {string} filePath
 * @param {{ rootDir: string, maxDepth: number, depth: number, stack: string[], imports: ResolvedImport[] }} ctx
 * @returns {string}
 */
function resolveFile(filePath, ctx) {
  const absolutePath = path.resolve(filePath)

  assertInsideRoot(absolutePath, ctx.rootDir, `Import escapes project root: ${formatPath(absolutePath)} is outside ${formatPath(ctx.rootDir)}`)

  if (ctx.stack.includes(absolutePath)) {
    const cycle = [...ctx.stack, absolutePath].map(formatPath).join(' -> ')
    throw new Error(`Import cycle detected: ${cycle}`)
  }

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Imported file not found: ${formatPath(absolutePath)}`)
  }

  let rawContent
  try {
    rawContent = fs.readFileSync(absolutePath, 'utf8')
  } catch (err) {
    throw new Error(`Could not read imported file ${formatPath(absolutePath)}: ${err.message}`)
  }

  const importerDir = path.dirname(absolutePath)
  const nextStack = [...ctx.stack, absolutePath]
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
      throw new Error(`Remote imports are not supported yet: ${spec}`)
    }

    const nextDepth = ctx.depth + 1
    if (nextDepth > ctx.maxDepth) {
      throw new Error(`Maximum import depth exceeded (${ctx.maxDepth}) while importing ${spec} from ${formatPath(absolutePath)}`)
    }

    const targetPath = path.resolve(importerDir, spec)
    assertInsideRoot(targetPath, ctx.rootDir, `Import escapes project root: ${spec} from ${formatPath(absolutePath)}`)

    ctx.imports.push({ from: absolutePath, to: targetPath, spec })
    importedChunks.push(resolveFile(targetPath, {
      ...ctx,
      depth: nextDepth,
      stack: nextStack,
    }))
  }

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

/**
 * @param {string} filePath
 * @returns {string}
 */
function formatPath(filePath) {
  return path.normalize(filePath)
}
