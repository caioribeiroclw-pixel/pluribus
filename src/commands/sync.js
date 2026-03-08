/**
 * pluribus sync — read pluribus.md and generate tool-specific output files.
 * Supports --dry-run, --tools, --source flags.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parsePluribusFile, validateSections, REQUIRED_SECTIONS } from '../utils/parser.js'
import { renderTemplate, parseSkillFile } from '../utils/renderer.js'
import { BUILT_IN_SKILLS, SUPPORTED_TOOLS } from '../skills/built-in.js'

/**
 * @param {Record<string, string | boolean>} args
 */
export async function runSync(args) {
  const isDryRun = Boolean(args['dry-run'])
  const sourceArg = typeof args.source === 'string' ? args.source : null
  const toolsArg = typeof args.tools === 'string' ? args.tools : null

  const cwd = process.cwd()

  // Resolve source file
  const sourcePath = sourceArg
    ? path.resolve(cwd, sourceArg)
    : path.join(cwd, 'pluribus.md')

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ pluribus.md not found at: ${sourcePath}`)
    console.error(`   Run \`pluribus init\` to create one.`)
    process.exit(1)
  }

  // Read and parse pluribus.md
  let rawContent
  try {
    rawContent = fs.readFileSync(sourcePath, 'utf8')
  } catch (err) {
    console.error(`❌ Could not read ${sourcePath}: ${err.message}`)
    process.exit(1)
  }

  const sections = parsePluribusFile(rawContent)

  // Validate required sections
  const { valid, errors } = validateSections(sections)
  if (!valid) {
    console.error('❌ pluribus.md has validation errors:')
    for (const e of errors) {
      console.error(`   • ${e}`)
    }
    console.error(`\n   Complete all required sections (${REQUIRED_SECTIONS.join(', ')}) and re-run.`)
    process.exit(1)
  }

  // Determine which tools to sync
  let toolsToSync

  if (toolsArg) {
    // Explicit override via --tools flag
    toolsToSync = toolsArg
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
  } else {
    // Read from pluribus.md comment: <!-- pluribus:tools: claude,cursor,openclaw -->
    const toolsCommentMatch = rawContent.match(/<!--\s*pluribus:tools:\s*([^-]+)\s*-->/)
    if (toolsCommentMatch) {
      toolsToSync = toolsCommentMatch[1]
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    } else {
      // Default: all supported tools
      toolsToSync = [...SUPPORTED_TOOLS]
    }
  }

  const unknownTools = toolsToSync.filter((t) => !SUPPORTED_TOOLS.includes(t))
  if (unknownTools.length > 0) {
    console.warn(`⚠️  Unknown tools will be skipped: ${unknownTools.join(', ')}`)
    console.warn(`   Supported: ${SUPPORTED_TOOLS.join(', ')}`)
    toolsToSync = toolsToSync.filter((t) => SUPPORTED_TOOLS.includes(t))
  }

  if (toolsToSync.length === 0) {
    console.error('❌ No valid tools to sync.')
    process.exit(1)
  }

  console.log(`🔄 Syncing pluribus.md → ${toolsToSync.join(', ')}${isDryRun ? ' (dry run)' : ''}`)
  console.log('')

  let successCount = 0
  let failCount = 0

  for (const toolId of toolsToSync) {
    // Check for local skill override first: pluribus/skills/<tool>.md
    const localSkillPath = path.join(cwd, 'pluribus', 'skills', `${toolId}.md`)
    let skill

    if (fs.existsSync(localSkillPath)) {
      console.log(`   📂 Using local skill override: ${localSkillPath}`)
      try {
        const skillContent = fs.readFileSync(localSkillPath, 'utf8')
        const parsed = parseSkillFile(skillContent)
        skill = {
          id: toolId,
          outputFiles: parsed.output,
          template: parsed.template,
          required: parsed.sections.required,
          optional: parsed.sections.optional,
        }
      } catch (err) {
        console.error(`   ❌ [${toolId}] Failed to parse local skill: ${err.message}`)
        failCount++
        continue
      }
    } else {
      skill = BUILT_IN_SKILLS[toolId]
    }

    if (!skill) {
      console.error(`   ❌ [${toolId}] Skill not found.`)
      failCount++
      continue
    }

    // Check required sections for this skill
    const missingRequired = skill.required.filter((s) => {
      const sectionName = Object.keys(sections).find(
        (k) => k.toLowerCase() === s.toLowerCase()
      )
      return !sectionName || !sections[sectionName]?.trim()
    })

    if (missingRequired.length > 0) {
      console.warn(`   ⚠️  [${toolId}] Skipping — missing required sections: ${missingRequired.join(', ')}`)
      failCount++
      continue
    }

    // Render the template
    let rendered
    try {
      rendered = renderTemplate(skill.template, sections, path.relative(cwd, sourcePath) || 'pluribus.md')
    } catch (err) {
      console.error(`   ❌ [${toolId}] Template rendering failed: ${err.message}`)
      failCount++
      continue
    }

    // Write output files
    for (const outputFile of skill.outputFiles) {
      const outputPath = path.join(cwd, outputFile)

      if (isDryRun) {
        console.log(`   📝 [dry-run] Would write: ${outputFile}`)
        console.log('   ' + '─'.repeat(60))
        const preview = rendered.split('\n').slice(0, 20).join('\n   ')
        console.log('   ' + preview)
        if (rendered.split('\n').length > 20) {
          console.log(`   ... (${rendered.split('\n').length - 20} more lines)`)
        }
        console.log('   ' + '─'.repeat(60))
        console.log('')
      } else {
        try {
          // Ensure parent directory exists
          const outputDir = path.dirname(outputPath)
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
          }
          fs.writeFileSync(outputPath, rendered, 'utf8')
          console.log(`   ✅ [${toolId}] → ${outputFile}`)
          successCount++
        } catch (err) {
          console.error(`   ❌ [${toolId}] Failed to write ${outputFile}: ${err.message}`)
          failCount++
        }
      }
    }
  }

  console.log('')

  if (isDryRun) {
    console.log(`📝 Dry run complete — no files were written.`)
  } else {
    if (failCount === 0) {
      console.log(`✅ Sync complete — ${successCount} file(s) written.`)
    } else {
      console.log(`✅ Sync complete — ${successCount} file(s) written, ${failCount} skipped/failed.`)
    }
  }
}
