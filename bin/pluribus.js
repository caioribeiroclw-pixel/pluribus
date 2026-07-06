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
import { runDemo } from '../src/commands/demo.js'
import { parseArgs } from '../src/utils/args.js'
import { SUPPORTED_TOOLS } from '../src/skills/built-in.js'
import { VERSION } from '../src/utils/version.js'

const supportedToolsList = SUPPORTED_TOOLS.join(',')

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
  demo      Run tiny packaged demos from npm without cloning the repo
  help      Show this help message

OPTIONS (init)
  --name          Project/author name
  --description   One-line project description
  --tools         Comma-separated list of tools to enable (${supportedToolsList})
  --dry-run       Preview the scaffold without writing pluribus.md

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
  --ci            Shortcut for --strict --github-annotations
  --json          Print machine-readable audit results
  --output        Write --json results to a file instead of stdout
  --github-annotations  Print GitHub Actions annotations for drift/missing outputs
  --fidelity-report  Include portability/fidelity evidence for selected targets

OPTIONS (watch)
  --source        Path to pluribus.md (default: ./pluribus.md)
  --tools         Override which tools to sync (comma-separated)
  --update-imports  Explicitly allow fetching remote github:/https:// imports
  --once          Exit after the first change-triggered sync
  --debounce      Debounce delay in ms (minimum 300, default 400)

OPTIONS (demo)
  --receipt       Validate a custom demo receipt JSON file
  --input         Import a custom demo input file, such as rpc-messages.jsonl
  --json          Print machine-readable demo results
  --pass          For context-sufficiency-trace, use the bundled passing trace
  --unsafe        For module-boundary-contract, use the bundled failing receipt

EXAMPLES
  pluribus init
  pluribus init --dry-run
  pluribus init --name "Ana" --description "A task manager" --tools claude,cursor
  pluribus sync
  pluribus sync --dry-run
  pluribus sync --tools claude,openclaw
  pluribus sync --update-imports
  pluribus validate
  pluribus audit
  pluribus audit --strict
  pluribus audit --ci
  pluribus audit --json
  pluribus audit --strict --json --output pluribus-audit.json
  pluribus audit --strict --github-annotations
  pluribus audit --json --fidelity-report
  pluribus watch --tools claude,cursor
  pluribus demo skill-use-rate
  pluribus demo skill-use-rate --json
  pluribus demo mcp-audit-receipt
  pluribus demo mcp-audit-receipt --json
  pluribus demo mcp-telemetry-import
  pluribus demo mcp-telemetry-import --json
  pluribus demo mcp-traffic-receipt
  pluribus demo mcp-traffic-receipt --json
  pluribus demo package-behavior-receipt
  pluribus demo package-behavior-receipt --json
  pluribus demo claude-extension-source-map
  pluribus demo claude-extension-source-map --json
  pluribus demo tool-surface-diff
  pluribus demo tool-surface-diff --json
  pluribus demo context-sufficiency-trace --json
  pluribus demo module-boundary-contract
  pluribus demo module-boundary-contract --unsafe
  pluribus demo instruction-context-audit
  pluribus demo instruction-context-audit --json
  pluribus demo style-rules-sync
  pluribus demo style-rules-sync --json
  pluribus demo context-budget-receipt
  pluribus demo context-budget-receipt --json
  pluribus demo company-memory-export-test
  pluribus demo company-memory-export-test --json
  pluribus demo shared-state-write-preflight
  pluribus demo shared-state-write-preflight --json
  pluribus demo cross-client-token-ledger
  pluribus demo cross-client-token-ledger --json
  pluribus demo mcp-action-boundary-preflight
  pluribus demo mcp-action-boundary-preflight --json

DOCS
  https://github.com/caioribeiroclw-pixel/pluribus
`

const COMMAND_FLAGS = {
  init: new Set(['name', 'description', 'tools', 'dry-run']),
  sync: new Set(['dry-run', 'tools', 'source', 'update-imports']),
  validate: new Set(['source', 'update-imports']),
  audit: new Set(['source', 'tools', 'update-imports', 'strict', 'ci', 'json', 'output', 'github-annotations', 'fidelity-report']),
  watch: new Set(['source', 'tools', 'update-imports', 'dry-run', 'once', 'debounce']),
  demo: new Set(['receipt', 'input', 'json', 'pass', 'unsafe']),
}

function getFlagNames(argv) {
  return argv
    .filter((arg) => arg.startsWith('--') && arg.length > 2)
    .map((arg) => {
      const withoutPrefix = arg.slice(2)
      const eqIdx = withoutPrefix.indexOf('=')
      return eqIdx === -1 ? withoutPrefix : withoutPrefix.slice(0, eqIdx)
    })
}

function validateFlags(command, argv) {
  const allowed = COMMAND_FLAGS[command]
  if (!allowed) return

  const unknown = [...new Set(getFlagNames(argv).filter((flag) => !allowed.has(flag)))]
  if (unknown.length === 0) return

  console.error(`❌ Unknown option${unknown.length === 1 ? '' : 's'} for \`${command}\`: ${unknown.map((flag) => `--${flag}`).join(', ')}`)
  console.error(`   Supported options: ${[...allowed].map((flag) => `--${flag}`).join(', ')}`)
  console.error('   Run `pluribus help` for usage.')
  process.exit(1)
}

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
  const commandArgs = args.slice(1)
  validateFlags(command, commandArgs)
  const parsedArgs = parseArgs(commandArgs)

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
      case 'demo':
        await runDemo(parsedArgs, commandArgs.filter((arg) => !arg.startsWith('--') && !Object.values(parsedArgs).includes(arg)))
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
