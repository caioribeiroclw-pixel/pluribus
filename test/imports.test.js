import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

import { parsePluribusFile } from '../src/utils/parser.js'
import { resolveImports } from '../src/utils/imports.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pluribus-imports-'))
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content.trimStart(), 'utf8')
}

const requiredSections = `
# Identity
Shared identity

# Stack
Shared stack

# Conventions
Shared conventions

# Goals
Shared goals

# Constraints
Shared constraints
`

test('expands local imports before local content so local duplicate sections win', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'shared', 'base-context.md'), requiredSections)
  writeFile(path.join(dir, 'pluribus.md'), `
# @import ./shared/base-context.md

# Goals
Local goals win
`)

  const resolved = resolveImports(path.join(dir, 'pluribus.md'))
  const sections = parsePluribusFile(resolved.content)

  assert.equal(resolved.imports.length, 1)
  assert.equal(sections.Identity, 'Shared identity')
  assert.equal(sections.Goals, 'Local goals win')
})

test('recognizes an import directive when the source file has a BOM', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'base.md'), '# Identity\nBOM import identity')
  fs.writeFileSync(path.join(dir, 'pluribus.md'), '\uFEFF# @import ./base.md\n', 'utf8')

  const sections = parsePluribusFile(resolveImports(path.join(dir, 'pluribus.md')).content)

  assert.equal(sections.Identity, 'BOM import identity')
})

test('supports nested imports up to the allowed max depth', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), '# @import ./l1.md\n\n# Goals\nRoot goals')
  writeFile(path.join(dir, 'l1.md'), '# @import ./l2.md\n\n# Identity\nL1 identity')
  writeFile(path.join(dir, 'l2.md'), '# @import ./l3.md\n\n# Stack\nL2 stack')
  writeFile(path.join(dir, 'l3.md'), '# @import ./l4.md\n\n# Conventions\nL3 conventions')
  writeFile(path.join(dir, 'l4.md'), '# @import ./l5.md\n\n# Constraints\nL4 constraints')
  writeFile(path.join(dir, 'l5.md'), '# Examples\nL5 examples')

  const sections = parsePluribusFile(resolveImports(path.join(dir, 'pluribus.md')).content)

  assert.equal(sections.Identity, 'L1 identity')
  assert.equal(sections.Stack, 'L2 stack')
  assert.equal(sections.Conventions, 'L3 conventions')
  assert.equal(sections.Constraints, 'L4 constraints')
  assert.equal(sections.Examples, 'L5 examples')
})

test('rejects imports deeper than max depth', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), '# @import ./l1.md')
  for (let i = 1; i <= 6; i++) {
    const next = i < 6 ? `# @import ./l${i + 1}.md\n` : '# Identity\nToo deep'
    writeFile(path.join(dir, `l${i}.md`), next)
  }

  assert.throws(
    () => resolveImports(path.join(dir, 'pluribus.md')),
    /Maximum import depth exceeded \(5\)/
  )
})

test('rejects import cycles with the path chain', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'pluribus.md'), '# @import ./a.md')
  writeFile(path.join(dir, 'a.md'), '# @import ./b.md')
  writeFile(path.join(dir, 'b.md'), '# @import ./a.md')

  assert.throws(
    () => resolveImports(path.join(dir, 'pluribus.md')),
    /Import cycle detected: .*pluribus\.md.*a\.md.*b\.md.*a\.md/s
  )
})

test('rejects imports that escape the project root', () => {
  const parent = tempProject()
  const project = path.join(parent, 'project')
  writeFile(path.join(parent, 'outside.md'), '# Identity\nOutside')
  writeFile(path.join(project, 'pluribus.md'), '# @import ../outside.md')

  assert.throws(
    () => resolveImports(path.join(project, 'pluribus.md')),
    /Import escapes project root/
  )
})

test('rejects GitHub and URL imports clearly', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'github.md'), '# @import github:owner/repo/path.md')
  writeFile(path.join(dir, 'url.md'), '# @import https://example.com/context.md')

  assert.throws(
    () => resolveImports(path.join(dir, 'github.md')),
    /Remote imports are not supported yet: github:owner\/repo\/path\.md/
  )
  assert.throws(
    () => resolveImports(path.join(dir, 'url.md')),
    /Remote imports are not supported yet: https:\/\/example\.com\/context\.md/
  )
})

test('sync keeps tool selection comment detection on the root raw source', () => {
  const dir = tempProject()
  writeFile(path.join(dir, 'shared', 'base-context.md'), `
<!-- pluribus:tools: cursor -->
${requiredSections}
`)
  writeFile(path.join(dir, 'pluribus.md'), `
<!-- pluribus:tools: claude -->
# @import ./shared/base-context.md
`)

  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'bin', 'pluribus.js'), 'sync', '--dry-run'],
    { cwd: dir, encoding: 'utf8' }
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /→ claude \(dry run\)/)
  assert.match(result.stdout, /Would write: CLAUDE\.md/)
  assert.doesNotMatch(result.stdout, /Would write: \.cursorrules/)
})
