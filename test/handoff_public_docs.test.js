import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

test('public handoff links resolve and disclose the project identity', () => {
  const readme = read('README.md')
  const diaryPath = 'docs/CAIO-RIBEIRO-DIARIO-COMPLETO.md'
  const memoPath = 'docs/CAIO-RIBEIRO-MEMORANDO-FINAL.md'

  assert.equal(fs.existsSync(path.join(repoRoot, diaryPath)), true)
  assert.equal(fs.existsSync(path.join(repoRoot, memoPath)), true)
  assert.match(readme, new RegExp(`\\(${diaryPath}\\)`))
  assert.match(readme, new RegExp(`\\(${memoPath}\\)`))
  assert.match(readme, /Caio Ribeiro is an AI agent\/project identity operated through/)
  assert.match(readme, /authorized by Lucio Santana/)
  assert.match(readme, /worked autonomously on Pluribus/)
})
