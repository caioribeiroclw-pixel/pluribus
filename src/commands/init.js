/**
 * pluribus init — create a pluribus.md file in the current directory.
 * Supports --name, --description, --tools flags or interactive prompts.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { SUPPORTED_TOOLS } from '../skills/built-in.js'

const DEFAULT_TOOLS = ['claude', 'cursor', 'openclaw']

/**
 * Ask a question via readline and return the answer.
 * @param {readline.Interface} rl
 * @param {string} question
 * @param {string} defaultValue
 * @returns {Promise<string>}
 */
function ask(rl, question, defaultValue) {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue || '')
    })
  })
}

/**
 * @param {Record<string, string | boolean>} args
 */
export async function runInit(args) {
  const targetDir = process.cwd()
  const outputPath = path.join(targetDir, 'pluribus.md')

  // Check if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`⚠️  pluribus.md already exists at ${outputPath}`)
    console.log('   Delete it first or run \`pluribus sync\` to regenerate outputs.')
    process.exit(1)
  }

  let name = args.name || ''
  let description = args.description || ''
  let toolsRaw = args.tools || ''

  const isInteractive = !args.name && !args.description && process.stdin.isTTY

  if (isInteractive) {
    console.log('\n📝 Pluribus Init — let\'s set up your context file.\n')
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    name = await ask(rl, '  Your name or team name', path.basename(targetDir))
    description = await ask(rl, '  Project description (one line)', 'A new project')
    const toolsDefault = DEFAULT_TOOLS.join(',')
    const toolsInput = await ask(rl, `  Tools to enable (${SUPPORTED_TOOLS.join(',')})`, toolsDefault)
    toolsRaw = toolsInput

    rl.close()
    console.log('')
  } else {
    // Non-interactive: fill defaults
    if (!name) name = path.basename(targetDir)
    if (!description) description = 'A new project'
    if (!toolsRaw) toolsRaw = DEFAULT_TOOLS.join(',')
  }

  const tools = String(toolsRaw)
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)

  const unknownTools = tools.filter((t) => !SUPPORTED_TOOLS.includes(t))
  if (unknownTools.length > 0) {
    console.warn(`⚠️  Unknown tools (will be ignored by sync): ${unknownTools.join(', ')}`)
    console.warn(`   Supported: ${SUPPORTED_TOOLS.join(', ')}`)
  }

  const content = generatePluribusTemplate(name, description, tools)

  fs.writeFileSync(outputPath, content, 'utf8')

  console.log(`✅ pluribus.md created at ${outputPath}`)
  console.log(`📝 Edit the file to fill in your project context.`)
  console.log(`🔄 Run \`pluribus sync\` to generate tool-specific files.`)
  console.log(`\n   Tools enabled: ${tools.join(', ')}`)
}

/**
 * Generate the pluribus.md template content.
 * @param {string} name
 * @param {string} description
 * @param {string[]} tools
 * @returns {string}
 */
function generatePluribusTemplate(name, description, tools) {
  const toolsComment = tools.length > 0
    ? `<!-- pluribus:tools: ${tools.join(',')} -->`
    : ''

  return `${toolsComment}

# Identity

I am ${name}, building **${description}**.

<!-- Describe who you are, what the project is, and (if applicable) the AI persona to adopt. Keep this concise — 3–10 lines. -->

# Stack

<!-- List your full technical picture: language + version, frameworks, key libraries, test tools, linter/formatter, infrastructure. -->
<!-- Example:
- **Language:** TypeScript 5.4 (strict mode)
- **Runtime:** Node.js 22 LTS
- **Framework:** None — pure Node CLI
- **Testing:** Jest 29 + ts-jest
- **Package manager:** pnpm
-->

- **Language:** (e.g. TypeScript 5.4)
- **Runtime:** (e.g. Node.js 22 LTS)
- **Framework:** (e.g. None)

# Conventions

<!-- How code is written in this project. Be opinionated and explicit. Cover: async patterns, error handling, naming conventions, file structure, forbidden patterns. -->
<!-- Example:
- Always use \`async/await\` — never \`.then()/.catch()\` chains
- No class-based code — use plain functions and closures
- File naming: \`kebab-case.ts\`
-->

- (Add your coding conventions here)

# Goals

<!-- What this project is optimizing for. List 3–7 goals in priority order. Be specific to this project. -->

1. (First goal)
2. (Second goal)
3. (Third goal)

# Constraints

<!-- Hard rules. What the AI must never do, regardless of context. -->
<!-- Example:
- Never introduce new dependencies without explicit confirmation
- Never use \`eval\`, \`Function()\`, or dynamic \`require()\`
-->

- (Add your hard constraints here)
`.trimStart()
}
