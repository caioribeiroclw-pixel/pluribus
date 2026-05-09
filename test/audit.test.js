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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-audit-'))
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
<!-- pluribus:tools: claude,cursor -->

# Identity
Audit user

# Stack
Node.js

# Conventions
Keep generated context reviewed

# Goals
Catch context drift

# Constraints
Do not leak secrets
`

test('audit reports generated files as current', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), validContext)

  const sync = runCli(dir, ['sync'])
  assert.equal(sync.status, 0, sync.stderr)

  const audit = runCli(dir, ['audit', '--strict'])

  assert.equal(audit.status, 0, audit.stderr)
  assert.match(audit.stdout, /\[claude\] CLAUDE\.md is current/)
  assert.match(audit.stdout, /\[cursor\] \.cursorrules is current/)
  assert.match(audit.stdout, /Summary: 2 current, 0 drifted, 0 missing, 0 error/)
})

test('audit detects drifted and missing generated files in strict mode', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), validContext)

  const sync = runCli(dir, ['sync'])
  assert.equal(sync.status, 0, sync.stderr)

  fs.appendFileSync(path.join(dir, 'CLAUDE.md'), '\nmanual edit\n')
  fs.rmSync(path.join(dir, '.cursorrules'))

  const audit = runCli(dir, ['audit', '--strict'])

  assert.equal(audit.status, 1)
  assert.match(audit.stdout, /\[claude\] CLAUDE\.md differs from generated output/)
  assert.match(audit.stdout, /\[cursor\] \.cursorrules is missing/)
  assert.match(audit.stdout, /Summary: 0 current, 1 drifted, 1 missing, 0 error/)
})

test('audit can print machine-readable JSON results', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), validContext)

  const sync = runCli(dir, ['sync'])
  assert.equal(sync.status, 0, sync.stderr)

  fs.appendFileSync(path.join(dir, 'CLAUDE.md'), '\nmanual edit\n')
  fs.rmSync(path.join(dir, '.cursorrules'))

  const audit = runCli(dir, ['audit', '--json', '--strict'])
  const payload = JSON.parse(audit.stdout)

  assert.equal(audit.status, 1)
  assert.equal(payload.ok, false)
  assert.deepEqual(payload.summary, {
    current: 0,
    drifted: 1,
    missing: 1,
    errors: 0,
  })
  assert.deepEqual(
    payload.results.map((result) => ({ toolId: result.toolId, status: result.status, file: result.file })),
    [
      { toolId: 'claude', status: 'drift', file: 'CLAUDE.md' },
      { toolId: 'cursor', status: 'missing', file: '.cursorrules' },
    ],
  )
  assert.match(payload.nextStep, /sync --dry-run/)
})

test('audit can emit GitHub Actions annotations without polluting JSON stdout', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), validContext)

  const sync = runCli(dir, ['sync'])
  assert.equal(sync.status, 0, sync.stderr)

  fs.appendFileSync(path.join(dir, 'CLAUDE.md'), '\nmanual edit\n')
  fs.rmSync(path.join(dir, '.cursorrules'))

  const audit = runCli(dir, ['audit', '--json', '--strict', '--github-annotations'])
  const payload = JSON.parse(audit.stdout)

  assert.equal(audit.status, 1)
  assert.equal(payload.summary.drifted, 1)
  assert.equal(payload.summary.missing, 1)
  assert.match(audit.stderr, /::error file=CLAUDE\.md,title=Pluribus audit%3A drift::CLAUDE\.md differs from generated claude output/)
  assert.match(audit.stderr, /::error file=\.cursorrules,title=Pluribus audit%3A missing::\.cursorrules is missing for cursor/)
})

test('audit can write JSON results to an output file for CI artifacts', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), validContext)

  const sync = runCli(dir, ['sync'])
  assert.equal(sync.status, 0, sync.stderr)

  fs.appendFileSync(path.join(dir, 'CLAUDE.md'), '\nmanual edit\n')
  fs.rmSync(path.join(dir, '.cursorrules'))

  const outputPath = path.join('reports', 'pluribus-audit.json')
  const audit = runCli(dir, ['audit', '--json', '--strict', '--github-annotations', '--output', outputPath])
  const payload = JSON.parse(fs.readFileSync(path.join(dir, outputPath), 'utf8'))

  assert.equal(audit.status, 1)
  assert.equal(audit.stdout, '')
  assert.equal(payload.summary.drifted, 1)
  assert.equal(payload.summary.missing, 1)
  assert.match(audit.stderr, /::error file=CLAUDE\.md,title=Pluribus audit%3A drift/)
})

test('audit output file requires JSON mode and a file path', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), validContext)

  const withoutJson = runCli(dir, ['audit', '--output', 'pluribus-audit.json'])
  const withoutPath = runCli(dir, ['audit', '--json', '--output'])

  assert.equal(withoutJson.status, 1)
  assert.match(withoutJson.stderr, /--output requires --json/)
  assert.equal(withoutPath.status, 1)
  assert.match(withoutPath.stderr, /--output requires a file path/)
})

test('audit without pluribus.md scans existing context files', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'CLAUDE.md'), '# Existing Claude context')
  writeFile(path.join(dir, '.github', 'copilot-instructions.md'), '# Existing Copilot context')

  const audit = runCli(dir, ['audit'])

  assert.equal(audit.status, 0, audit.stderr)
  assert.match(audit.stdout, /No pluribus\.md found/)
  assert.match(audit.stdout, /CLAUDE\.md/)
  assert.match(audit.stdout, /\.github\/copilot-instructions\.md/)
  assert.match(audit.stdout, /migrate-existing-context\.md/)
})

test('audit without pluribus.md can print JSON discovery results', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'CLAUDE.md'), '# Existing Claude context')
  writeFile(path.join(dir, '.github', 'copilot-instructions.md'), '# Existing Copilot context')

  const audit = runCli(dir, ['audit', '--json'])
  const payload = JSON.parse(audit.stdout)

  assert.equal(audit.status, 0, audit.stderr)
  assert.equal(payload.ok, true)
  assert.equal(payload.sourceFound, false)
  assert.deepEqual(payload.existingContextFiles, ['.github/copilot-instructions.md', 'CLAUDE.md'])
  assert.equal(payload.summary.existingContextFiles, 2)
  assert.match(payload.docs, /migrate-existing-context\.md/)
})

test('audit JSON schema is packaged and matches the emitted top-level contract', () => {
  const schemaPath = path.join(repoRoot, 'schemas', 'audit-result.schema.json')
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))

  assert.equal(schema.title, 'Pluribus audit JSON result')
  assert.deepEqual(schema.required, ['ok', 'source', 'sourceFound', 'summary', 'nextStep'])
  assert.equal(schema.properties.results.items.$ref, '#/$defs/result')
  assert.deepEqual(schema.$defs.result.properties.status.enum, ['current', 'missing', 'drift', 'error'])
})
