#!/usr/bin/env node

/**
 * Pluribus CLI — Write your AI context once. Sync it to every tool.
 * Entry point: bin/pluribus.js
 */

import { runInit } from '../src/commands/init.js'
import { runSync } from '../src/commands/sync.js'
import { runValidate } from '../src/commands/validate.js'
import { runWatch } from '../src/commands/watch.js'
import { runAudit } from '../src/commands/audit.js'
import { parseArgs } from '../src/utils/args.js'
import { VERSION } from '../src/utils/version.js'

const HELP = `
Pluribus v${VERSION} — Write your AI context once. Sync it to every tool.

USAGE
  pluribus <command> [options]

COMMANDS
  init      Create a pluribus.md file in the current directory
  sync      Read pluribus.md and generate tool-specific output files
  validate  Validate pluribus.md before syncing
  audit     Compare generated tool files with pluribus.md without writing
  watch     Watch pluribus.md and auto-sync after changes
  help      Show this help message

OPTIONS (init)
  --name          Project/author name
  --description   One-line project description
  --tools         Comma-separated list of tools to enable (claude,cursor,openclaw)

OPTIONS (sync)
  --dry-run       Preview output without writing files
  --tools         Override which tools to sync (comma-separated)
  --source        Path to pluribus.md (default: ./pluribus.md)
  --update-imports  Explicitly allow fetching remote github:/https:// imports

OPTIONS (validate)
  --source        Path to pluribus.md (default: ./pluribus.md)
  --update-imports  Refresh remote github:/https:// imports before validating

OPTIONS (audit)
  --source        Path to pluribus.md (default: ./pluribus.md)
  --tools         Override which tools to audit (comma-separated)
  --update-imports  Refresh remote github:/https:// imports before auditing
  --strict        Exit non-zero when generated files are missing or drifted
  --json          Print machine-readable audit results
  --output        Write --json results to a file instead of stdout
  --github-annotations  Print GitHub Actions annotations for drift/missing outputs

OPTIONS (watch)
  --source        Path to pluribus.md (default: ./pluribus.md)
  --tools         Override which tools to sync (comma-separated)
  --update-imports  Explicitly allow fetching remote github:/https:// imports
  --once          Exit after the first change-triggered sync
  --debounce      Debounce delay in ms (minimum 300, default 400)

EXAMPLES
  pluribus init
  pluribus init --name "Ana" --description "A task manager" --tools claude,cursor
  pluribus sync
  pluribus sync --dry-run
  pluribus sync --tools claude,openclaw
  pluribus sync --update-imports
  pluribus validate
  pluribus audit
  pluribus audit --strict
  pluribus audit --json
  pluribus audit --strict --json --output pluribus-audit.json
  pluribus audit --strict --github-annotations
  pluribus watch --tools claude,cursor

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
        await runValidate(parsedArgs)
        break
      case 'watch':
        await runWatch(parsedArgs)
        break
      case 'audit':
        await runAudit(parsedArgs)
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
