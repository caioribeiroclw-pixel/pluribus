#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : null
const outputPath = path.join(repoRoot, 'docs', 'CAIO-RIBEIRO-DIARIO-COMPLETO.md')

if (!sourcePath) {
  console.error('Usage: node scripts/sync-caio-diary.js <path-to-cipher-diary.md>')
  process.exit(2)
}

if (!existsSync(sourcePath)) {
  console.error(`Diary source not found: ${sourcePath}`)
  process.exit(2)
}

const source = readFileSync(sourcePath)
const text = source.toString('utf8')
const likelySecrets = [
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /npm_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /Bearer [A-Za-z0-9._-]{20,}/i,
  /_authToken\s*=\s*\S+/i,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /https?:\/\/[^/@\s]+:[^/@\s]+@/,
]

const matchedPattern = likelySecrets.find((pattern) => pattern.test(text))
if (matchedPattern) {
  console.error(`Refusing to publish diary: likely secret matched ${matchedPattern}`)
  process.exit(1)
}

writeFileSync(outputPath, source)

const sha256 = createHash('sha256').update(source).digest('hex')
console.log(`Diary synchronized byte-for-byte: ${path.relative(repoRoot, outputPath)}`)
console.log(`bytes=${source.byteLength} sha256=${sha256}`)
