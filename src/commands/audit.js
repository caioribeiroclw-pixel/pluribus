/**
 * pluribus audit — inspect AI context files and report sync drift.
 *
 * The command is intentionally read-only. With a pluribus.md source present it
 * renders the expected tool files and compares them with what is on disk. When
 * pluribus.md is not present, it scans for known context files to help users
 * decide whether they need a migration pass before adopting Pluribus.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parsePluribusFile, validateSections, REQUIRED_SECTIONS } from '../utils/parser.js'
import { resolveImportsAsync } from '../utils/imports.js'
import { renderTemplate, parseSkillFile } from '../utils/renderer.js'
import { BUILT_IN_SKILLS, SUPPORTED_TOOLS } from '../skills/built-in.js'

const TOOLS_COMMENT_RE = /<!--\s*pluribus:tools:\s*([^-]+)\s*-->/
const KNOWN_CONTEXT_FILES = [
  ...new Set([
    ...Object.values(BUILT_IN_SKILLS).flatMap((skill) => skill.outputFiles),
    '.cursor/rules',
    '.github/instructions',
    'AGENTS.md',
    'CLAUDE.md',
  ]),
]

/**
 * @param {Record<string, string | boolean>} args
 */
export async function runAudit(args) {
  const sourceArg = typeof args.source === 'string' ? args.source : null
  const toolsArg = typeof args.tools === 'string' ? args.tools : null
  const updateImports = Boolean(args['update-imports'])
  const strict = Boolean(args.strict)
  const cwd = process.cwd()
  const sourcePath = sourceArg
    ? path.resolve(cwd, sourceArg)
    : path.join(cwd, 'pluribus.md')
  const displaySource = path.relative(cwd, sourcePath) || 'pluribus.md'

  if (!fs.existsSync(sourcePath)) {
    const found = scanKnownContextFiles(cwd)
    console.log(`ℹ️  No ${displaySource} found.`)

    if (found.length > 0) {
      console.log('')
      console.log('Found existing AI context surface(s):')
      for (const file of found) {
        console.log(`   • ${file}`)
      }
      console.log('')
      console.log('Use these as migration inputs for `pluribus init`, then run `pluribus audit` again.')
    } else {
      console.log('')
      console.log('No known AI context files found in this directory.')
      console.log('Run `pluribus init` to create a source file, then `pluribus sync --dry-run`.')
    }

    console.log('Docs: https://github.com/caioribeiroclw-pixel/pluribus/blob/main/docs/migrate-existing-context.md')
    if (strict) process.exit(1)
    return
  }

  let rawContent
  try {
    rawContent = fs.readFileSync(sourcePath, 'utf8')
  } catch (err) {
    console.error(`❌ Could not read ${sourcePath}: ${err.message}`)
    process.exit(1)
  }

  const errors = []
  let resolvedContent
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
  } catch (err) {
    errors.push(`Could not resolve imports: ${err.message}`)
  }

  const sections = resolvedContent ? parsePluribusFile(resolvedContent) : {}
  const validation = validateSections(sections)
  for (const error of validation.errors) {
    errors.push(error)
  }

  const tools = getTools(rawContent, toolsArg)
  const unknownTools = tools.filter((tool) => !SUPPORTED_TOOLS.includes(tool))
  if (unknownTools.length > 0) {
    errors.push(`Unknown tool(s): ${unknownTools.join(', ')}. Supported: ${SUPPORTED_TOOLS.join(', ')}`)
  }

  if (errors.length > 0) {
    console.error(`❌ Cannot audit ${displaySource}:`)
    for (const error of errors) {
      console.error(`   • ${error}`)
    }
    console.error(`\n   Complete required sections (${REQUIRED_SECTIONS.join(', ')}) and re-run.`)
    process.exit(1)
  }

  console.log(`🔎 Auditing ${displaySource} → ${tools.join(', ')}`)
  console.log('')

  const results = []
  for (const toolId of tools) {
    const skill = loadSkill(cwd, toolId)
    if (!skill) {
      results.push({ toolId, status: 'error', file: '(skill)', message: 'Skill not found' })
      continue
    }

    const missingRequired = skill.required.filter((required) => {
      const sectionName = Object.keys(sections).find((name) => name.toLowerCase() === required.toLowerCase())
      return !sectionName || !sections[sectionName]?.trim()
    })

    if (missingRequired.length > 0) {
      results.push({
        toolId,
        status: 'error',
        file: '(sections)',
        message: `Missing required section(s) for ${toolId}: ${missingRequired.join(', ')}`,
      })
      continue
    }

    let rendered
    try {
      rendered = renderTemplate(skill.template, sections, path.relative(cwd, sourcePath) || 'pluribus.md')
    } catch (err) {
      results.push({ toolId, status: 'error', file: '(template)', message: err.message })
      continue
    }

    for (const outputFile of skill.outputFiles) {
      const outputPath = path.join(cwd, outputFile)
      if (!fs.existsSync(outputPath)) {
        results.push({ toolId, status: 'missing', file: outputFile })
        continue
      }

      const existing = fs.readFileSync(outputPath, 'utf8')
      if (normalizeGeneratedMetadata(existing) === normalizeGeneratedMetadata(rendered)) {
        results.push({ toolId, status: 'current', file: outputFile })
      } else {
        results.push({ toolId, status: 'drift', file: outputFile })
      }
    }
  }

  for (const result of results) {
    const label = `[${result.toolId}] ${result.file}`
    if (result.status === 'current') {
      console.log(`   ✅ ${label} is current`)
    } else if (result.status === 'missing') {
      console.log(`   ⚠️  ${label} is missing`)
    } else if (result.status === 'drift') {
      console.log(`   ⚠️  ${label} differs from generated output`)
    } else {
      console.log(`   ❌ ${label}: ${result.message}`)
    }
  }

  const summary = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1
    return acc
  }, {})

  console.log('')
  console.log(`Summary: ${summary.current || 0} current, ${summary.drift || 0} drifted, ${summary.missing || 0} missing, ${summary.error || 0} error(s).`)

  const hasProblem = (summary.drift || 0) + (summary.missing || 0) + (summary.error || 0) > 0
  if (hasProblem) {
    console.log('Run `pluribus sync --dry-run` to preview fixes, then `pluribus sync` to update generated files.')
  } else {
    console.log('✅ Generated context files are in sync.')
  }

  if ((strict && hasProblem) || (summary.error || 0) > 0) {
    process.exit(1)
  }
}

function getTools(rawContent, toolsArg) {
  if (toolsArg) {
    return splitTools(toolsArg)
  }

  const match = rawContent.match(TOOLS_COMMENT_RE)
  if (match) {
    return splitTools(match[1])
  }

  return [...SUPPORTED_TOOLS]
}

function splitTools(value) {
  return String(value)
    .split(',')
    .map((tool) => tool.trim().toLowerCase())
    .filter(Boolean)
}

function loadSkill(cwd, toolId) {
  const localSkillPath = path.join(cwd, 'pluribus', 'skills', `${toolId}.md`)
  if (fs.existsSync(localSkillPath)) {
    const parsed = parseSkillFile(fs.readFileSync(localSkillPath, 'utf8'))
    return {
      id: toolId,
      outputFiles: parsed.output,
      template: parsed.template,
      required: parsed.sections.required,
      optional: parsed.sections.optional,
    }
  }

  return BUILT_IN_SKILLS[toolId]
}

function scanKnownContextFiles(cwd) {
  return KNOWN_CONTEXT_FILES
    .filter((relativePath) => fs.existsSync(path.join(cwd, relativePath)))
    .sort()
}

function normalizeGeneratedMetadata(content) {
  return content
    .replace(/Generated by Pluribus ([^\s]+) on \d{4}-\d{2}-\d{2}/g, 'Generated by Pluribus $1 on <date>')
    .replace(/generated by Pluribus ([^\s]+) on \d{4}-\d{2}-\d{2}/g, 'generated by Pluribus $1 on <date>')
}
