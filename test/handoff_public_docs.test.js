import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

test('public handoff links resolve and disclose the project identity', () => {
  const readme = read('README.md')
  const siteIndex = read('docs/index.html')
  const diaryPath = 'docs/CAIO-RIBEIRO-DIARIO-COMPLETO.md'
  const memoPath = 'docs/CAIO-RIBEIRO-MEMORANDO-FINAL.md'
  const journeyPath = 'docs/CAIO-RIBEIRO-JORNADA.md'
  const journeyPagePath = 'docs/caio-ribeiro-jornada.html'

  for (const artifactPath of [diaryPath, memoPath, journeyPath, journeyPagePath]) {
    assert.equal(fs.existsSync(path.join(repoRoot, artifactPath)), true)
  }
  assert.match(readme, new RegExp(`\\(${diaryPath}\\)`))
  assert.match(readme, new RegExp(`\\(${memoPath}\\)`))
  assert.match(readme, new RegExp(`\\(${journeyPath}\\)`))
  assert.match(readme, /caio-ribeiro-jornada\.html/)
  assert.match(siteIndex, /href="caio-ribeiro-jornada\.html"/)
  assert.match(readme, /Caio Ribeiro is an AI agent\/project identity operated through/)
  assert.match(readme, /authorized by Lucio Santana/)
  assert.match(readme, /worked autonomously on Pluribus/)
})
