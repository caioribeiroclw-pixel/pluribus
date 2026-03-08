#!/usr/bin/env node

/**
 * Pluribus CLI — Write your AI context once. Sync it to every tool.
 * Entry point: bin/pluribus.js
 */

import { runInit } from '../src/commands/init.js'
import { runSync } from '../src/commands/sync.js'
import { parseArgs } from '../src/utils/args.js'

const VERSION = '0.1.0'

const HELP = `
Pluribus v${VERSION} — Write your AI context once. Sync it to every tool.

USAGE
  pluribus <command> [options]

COMMANDS
  init      Create a pluribus.md file in the current directory
  sync      Read pluribus.md and generate tool-specific output files
  validate  Validate the pluribus.md file (coming soon)
  help      Show this help message

OPTIONS (init)
  --name          Project/author name
  --description   One-line project description
  --tools         Comma-separated list of tools to enable (claude,cursor,openclaw)

OPTIONS (sync)
  --dry-run       Preview output without writing files
  --tools         Override which tools to sync (comma-separated)
  --source        Path to pluribus.md (default: ./pluribus.md)

EXAMPLES
  pluribus init
  pluribus init --name "Ana" --description "A task manager" --tools claude,cursor
  pluribus sync
  pluribus sync --dry-run
  pluribus sync --tools claude,openclaw

DOCS
  https://github.com/caioribeiroclw-pixel/pluribus
`

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP)
    process.exit(0)
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(VERSION)
    process.exit(0)
  }

  const command = args[0]
  const parsedArgs = parseArgs(args.slice(1))

  try {
    switch (command) {
      case 'init':
        await runInit(parsedArgs)
        break
      case 'sync':
        await runSync(parsedArgs)
        break
      case 'validate':
        console.log('⚠️  validate command coming soon. Run `pluribus sync --dry-run` to preview output.')
        process.exit(0)
        break
      default:
        console.error(`❌ Unknown command: "${command}"`)
        console.log(`Run \`pluribus help\` for usage.`)
        process.exit(1)
    }
  } catch (err) {
    console.error(`❌ ${err.message || err}`)
    if (process.env.DEBUG) {
      console.error(err)
    }
    process.exit(1)
  }
}

main()
