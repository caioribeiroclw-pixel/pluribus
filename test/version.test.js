import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { SUPPORTED_TOOLS } from '../src/skills/built-in.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = path.join(repoRoot, 'bin', 'pluribus.js')
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-version-'))
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

const context = `
# Identity
Version smoke project.

# Stack
Node.js.

# Conventions
Keep generated metadata accurate.

# Goals
Verify package release metadata.

# Constraints
Do not publish stale versions.
`

test('CLI version matches package.json version', () => {
  const result = runCli(repoRoot, ['--version'])

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), packageJson.version)
})

test('help text shows the package version and supported tools', () => {
  const result = runCli(repoRoot, ['--help'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, new RegExp(`Pluribus v${packageJson.version.replaceAll('.', '\\.')}`))
  assert.match(
    result.stdout,
    new RegExp(`--tools\\s+Comma-separated list of tools to enable \\(${SUPPORTED_TOOLS.join(',')}\\)`),
  )
})

test('generated tool files use the package version', () => {
  const dir = tempProject()
  fs.writeFileSync(path.join(dir, 'pluribus.md'), context.trimStart(), 'utf8')

  const result = runCli(dir, ['sync', '--tools', 'claude'])

  assert.equal(result.status, 0, result.stderr)
  const output = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8')
  assert.match(output, new RegExp(`Pluribus ${packageJson.version.replaceAll('.', '\\.')}`))
})
