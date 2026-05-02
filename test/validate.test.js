import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = path.join(repoRoot, 'bin', 'pluribus.js')

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-validate-'))
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content.trimStart(), 'utf8')
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

const validContext = `
<!-- pluribus:tools: claude,cursor,openclaw -->

# Identity
Valid identity

# Stack
Node.js

# Conventions
Keep it simple

# Goals
Validate before syncing

# Constraints
No secrets
`

test('validate exits zero for a valid pluribus.md', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), validContext)

  const result = runCli(dir, ['validate'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /pluribus\.md is valid/)
})

test('validate resolves local imports before checking required sections', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'shared', 'base.md'), validContext)
  writeFile(path.join(dir, 'pluribus.md'), '# @import ./shared/base.md')

  const result = runCli(dir, ['validate'])

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Imports resolved \(1\)/)
})

test('validate exits non-zero for missing required sections', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), '# Identity\nOnly identity')

  const result = runCli(dir, ['validate'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Missing or empty required section: # Stack/)
})

test('validate catches duplicate sections and unknown tools comments', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), `
<!-- pluribus:tools: claude,curzor -->

# Identity
First

# Identity
Second

# Stack
Node.js

# Conventions
Keep it simple

# Goals
Validate before syncing

# Constraints
No secrets
`)

  const result = runCli(dir, ['validate'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Duplicate section: # Identity/)
  assert.match(result.stderr, /Unknown tool\(s\).*curzor/)
})
