/**
 * pluribus validate — check pluribus.md before sync.
 *
 * Validation intentionally mirrors sync's source/import behavior, but it does
 * not render or write tool output. Remote imports are only refreshed when
 * --update-imports is passed; otherwise locked remote imports must resolve from
 * the local lock/cache path.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parsePluribusFile, validateSections, REQUIRED_SECTIONS } from '../utils/parser.js'
import { resolveImportsAsync } from '../utils/imports.js'
import { SUPPORTED_TOOLS } from '../skills/built-in.js'

const TOOLS_COMMENT_RE = /<!--\s*pluribus:tools:\s*([^-]+)\s*-->/

/**
 * @param {Record<string, string | boolean>} args
 */
export async function runValidate(args) {
  const sourceArg = typeof args.source === 'string' ? args.source : null
  const updateImports = Boolean(args['update-imports'])
  const cwd = process.cwd()
  const sourcePath = sourceArg
    ? path.resolve(cwd, sourceArg)
    : path.join(cwd, 'pluribus.md')

  const errors = []
  const warnings = []

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ pluribus.md not found at: ${sourcePath}`)
    console.error('   Run `pluribus init` to create one.')
    process.exit(1)
  }

  let rawContent
  try {
    rawContent = fs.readFileSync(sourcePath, 'utf8')
  } catch (err) {
    console.error(`❌ Could not read ${sourcePath}: ${err.message}`)
    process.exit(1)
  }

  console.log(`✓ Found ${path.relative(cwd, sourcePath) || 'pluribus.md'}`)

  const duplicateSections = findDuplicateSections(rawContent)
  for (const duplicate of duplicateSections) {
    errors.push(`Duplicate section: # ${duplicate.name} (lines ${duplicate.firstLine} and ${duplicate.line})`)
  }

  const rawSections = parsePluribusFile(rawContent)
  if (Object.keys(rawSections).length === 0) {
    errors.push('No top-level sections found. Add required # Identity, # Stack, # Conventions, # Goals, and # Constraints sections.')
  } else {
    console.log(`✓ Detected ${Object.keys(rawSections).length} top-level section(s) before imports`)
  }

  const tools = parseToolsComment(rawContent)
  if (tools.length > 0) {
    const unknownTools = tools.filter((tool) => !SUPPORTED_TOOLS.includes(tool))
    if (unknownTools.length > 0) {
      errors.push(`Unknown tool(s) in pluribus:tools comment: ${unknownTools.join(', ')}. Supported: ${SUPPORTED_TOOLS.join(', ')}`)
    } else {
      console.log(`✓ Tools comment is valid: ${tools.join(', ')}`)
    }
  }

  let resolvedContent
  let importCount = 0
  try {
    const projectDir = path.dirname(sourcePath)
    const resolved = await resolveImportsAsync(sourcePath, {
      rootDir: projectDir,
      allowRemote: updateImports,
      lockfilePath: path.join(projectDir, 'pluribus.lock.json'),
      cacheDir: path.join(projectDir, '.pluribus', 'cache', 'remote'),
      updateLockfile: updateImports,
    })
    resolvedContent = resolved.content
    importCount = resolved.imports.length
    console.log(`✓ Imports resolved (${importCount})${updateImports ? ' with refresh enabled' : ''}`)
  } catch (err) {
    errors.push(`Could not resolve imports: ${err.message}`)
  }

  if (resolvedContent) {
    const sections = parsePluribusFile(resolvedContent)
    const validation = validateSections(sections)
    for (const error of validation.errors) {
      errors.push(error)
    }

    const missingRecommended = REQUIRED_SECTIONS.filter((section) => !sections[section]?.trim())
    if (missingRecommended.length === 0) {
      console.log(`✓ Required sections are present: ${REQUIRED_SECTIONS.join(', ')}`)
    }
  }

  for (const warning of warnings) {
    console.warn(`⚠️  ${warning}`)
  }

  if (errors.length > 0) {
    console.error('')
    for (const error of errors) {
      console.error(`✗ ${error}`)
    }
    console.error(`\nFound ${errors.length} error(s). Fix before syncing.`)
    process.exit(1)
  }

  console.log('')
  console.log('✅ pluribus.md is valid. Ready to sync.')
}

function findDuplicateSections(content) {
  const cleaned = content.replace(/^\uFEFF/, '')
  const seen = new Map()
  const duplicates = []
  const lines = cleaned.split(/\r?\n/)

  lines.forEach((line, idx) => {
    if (!line.startsWith('# ') || line.startsWith('## ')) return
    const name = line.slice(2).trim()
    const key = name.toLowerCase()
    const lineNumber = idx + 1
    if (seen.has(key)) {
      duplicates.push({ name, firstLine: seen.get(key), line: lineNumber })
    } else {
      seen.set(key, lineNumber)
    }
  })

  return duplicates
}

function parseToolsComment(content) {
  const match = content.match(TOOLS_COMMENT_RE)
  if (!match) return []
  return match[1]
    .split(',')
    .map((tool) => tool.trim().toLowerCase())
    .filter(Boolean)
}
