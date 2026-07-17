#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const valueFor = (flag) => {
  const index = args.indexOf(flag)
  return index === -1 ? null : args[index + 1]
}

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(valueFor('--repo-root') || defaultRepoRoot)
const sourceArg = valueFor('--source')
const allowDraft = args.includes('--allow-draft')

if (!sourceArg) {
  console.error(
    'Usage: node scripts/handoff-closeout-check.js --source <diary.md> [--repo-root <path>] [--allow-draft]',
  )
  process.exit(2)
}

const sourcePath = path.resolve(sourceArg)
const diaryPath = path.join(repoRoot, 'docs', 'CAIO-RIBEIRO-DIARIO-COMPLETO.md')
const memoPath = path.join(repoRoot, 'docs', 'CAIO-RIBEIRO-MEMORANDO-FINAL.md')
const readmePath = path.join(repoRoot, 'README.md')
const requiredPaths = [sourcePath, diaryPath, memoPath, readmePath]
const missingPath = requiredPaths.find((filePath) => !existsSync(filePath))

if (missingPath) {
  console.error(`Final handoff file is missing: ${missingPath}`)
  process.exit(1)
}

const source = readFileSync(sourcePath)
const diary = readFileSync(diaryPath)
const memo = readFileSync(memoPath, 'utf8')
const readme = readFileSync(readmePath, 'utf8')

if (source.length === 0 || diary.length === 0 || memo.length === 0) {
  console.error('Final handoff files must be non-empty')
  process.exit(1)
}

if (!source.equals(diary)) {
  console.error('Public diary does not match the canonical source byte-for-byte')
  process.exit(1)
}

const requiredReadmePatterns = [
  '(docs/CAIO-RIBEIRO-DIARIO-COMPLETO.md)',
  '(docs/CAIO-RIBEIRO-MEMORANDO-FINAL.md)',
  'Caio Ribeiro is an AI agent/project identity operated through',
  'authorized by Lucio Santana',
]
const missingReadmePattern = requiredReadmePatterns.find(
  (pattern) => !readme.includes(pattern),
)
if (missingReadmePattern) {
  console.error(`README handoff contract is missing: ${missingReadmePattern}`)
  process.exit(1)
}

if (!memo.includes('2026-07-18')) {
  console.error('Final memorandum must include the 2026-07-18 closeout date')
  process.exit(1)
}

if (!allowDraft) {
  const stalePattern = /Rascunho|será fechado em 2026-07-18|estado em 2026-07-16/i
  const staleMatch = memo.match(stalePattern)
  if (staleMatch) {
    console.error(`Final memorandum is still draft or stale: ${staleMatch[0]}`)
    process.exit(1)
  }
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
console.log(
  JSON.stringify({
    status: 'ok',
    allowDraft,
    diaryBytes: diary.length,
    diarySha256: sha256(diary),
    memoSha256: sha256(Buffer.from(memo)),
  }),
)
