/**
 * Template renderer for Pluribus Template Syntax (PTS)
 * Supports: {{variable}}, {{#if variable}} ... {{/if}}, {{pluribus.version}}, {{pluribus.date}}, {{pluribus.source}}
 */

import { slugify } from './parser.js'

const VERSION = '0.1.0'

/**
 * @param {string} template
 * @param {Record<string, string>} sections  — raw sections from parsePluribusFile
 * @param {string} sourcePath
 * @returns {string}
 */
export function renderTemplate(template, sections, sourcePath) {
  // Build a variables map: both exact name and slug → content
  const vars = {}

  for (const [name, body] of Object.entries(sections)) {
    vars[name.toLowerCase()] = body
    vars[slugify(name)] = body
  }

  // Built-in pluribus.* variables
  const meta = {
    'pluribus.version': VERSION,
    'pluribus.date': new Date().toISOString().slice(0, 10),
    'pluribus.source': sourcePath,
  }

  let result = template

  // 1. Process {{#if variable}} ... {{/if}} blocks
  result = result.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) => {
    const val = vars[key.trim().toLowerCase()] ?? vars[key.trim()]
    if (val && val.trim() !== '') {
      // Render inner (still apply variable substitution later)
      return inner
    }
    return ''
  })

  // 2. Replace {{pluribus.*}} meta vars
  for (const [key, value] of Object.entries(meta)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }

  // 3. Replace {{variable}} with section content
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const k = key.trim().toLowerCase()
    if (vars[k] !== undefined) return vars[k]
    if (vars[key.trim()] !== undefined) return vars[key.trim()]
    // Unknown variable: emit warning but keep the placeholder commented out
    return `<!-- pluribus: unknown variable "${key.trim()}" -->`
  })

  return result.trim() + '\n'
}

/**
 * Parse a skill file into its sections.
 * @param {string} content
 * @returns {{ output: string[], template: string, sections: { required: string[], optional: string[] }, meta: Record<string, string> }}
 */
export function parseSkillFile(content) {
  // Split into top-level sections
  const rawSections = {}
  const lines = content.split(/\r?\n/)
  let currentSection = null
  let currentLines = []

  for (const line of lines) {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      if (currentSection !== null) {
        rawSections[currentSection] = currentLines.join('\n').trim()
      }
      currentSection = line.slice(2).trim()
      currentLines = []
    } else {
      if (currentSection !== null) {
        currentLines.push(line)
      }
    }
  }
  if (currentSection !== null) {
    rawSections[currentSection] = currentLines.join('\n').trim()
  }

  // Parse # Output — list of file paths
  const outputRaw = rawSections['Output'] || ''
  const output = outputRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))

  // Parse # Sections — required: ..., optional: ...
  const sectionsRaw = rawSections['Sections'] || ''
  const requiredMatch = sectionsRaw.match(/required:\s*(.+)/)
  const optionalMatch = sectionsRaw.match(/optional:\s*(.+)/)
  const requiredSections = requiredMatch
    ? requiredMatch[1].split(',').map((s) => s.trim())
    : []
  const optionalSections = optionalMatch
    ? optionalMatch[1].split(',').map((s) => s.trim())
    : []

  // Parse # Meta
  const metaRaw = rawSections['Meta'] || ''
  const meta = {}
  for (const line of metaRaw.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':')
    if (colonIdx !== -1) {
      meta[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
    }
  }

  return {
    output,
    template: rawSections['Template'] || '',
    sections: { required: requiredSections, optional: optionalSections },
    meta,
  }
}
