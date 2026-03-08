/**
 * pluribus.md parser
 * Splits a markdown file into top-level sections (# Heading)
 * Returns an object: { sectionName: sectionBody }
 */

/**
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parsePluribusFile(content) {
  // Strip BOM if present
  const cleaned = content.replace(/^\uFEFF/, '')

  const sections = {}
  const lines = cleaned.split(/\r?\n/)

  let currentSection = null
  let currentLines = []

  for (const line of lines) {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      // Save previous section
      if (currentSection !== null) {
        sections[currentSection] = currentLines.join('\n').trim()
      }
      currentSection = line.slice(2).trim()
      currentLines = []
    } else {
      if (currentSection !== null) {
        currentLines.push(line)
      }
    }
  }

  // Save last section
  if (currentSection !== null) {
    sections[currentSection] = currentLines.join('\n').trim()
  }

  return sections
}

/**
 * Returns the slug form of a section name (lowercase, spaces→hyphens)
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

/** Required sections per the spec */
export const REQUIRED_SECTIONS = ['Identity', 'Stack', 'Conventions', 'Goals', 'Constraints']

/** Optional sections per the spec */
export const OPTIONAL_SECTIONS = ['Examples', 'Anti-patterns', 'Workflow', 'Context', 'Team']

/**
 * Validate a parsed pluribus.md sections object.
 * @param {Record<string, string>} sections
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSections(sections) {
  const errors = []
  for (const required of REQUIRED_SECTIONS) {
    if (!sections[required] || sections[required].trim() === '') {
      errors.push(`Missing or empty required section: # ${required}`)
    }
  }

  // Check for duplicates (can't happen with our parser since later overwrites earlier, but let's be safe)
  return { valid: errors.length === 0, errors }
}
