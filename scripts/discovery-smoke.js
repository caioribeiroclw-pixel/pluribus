#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))

const npmQueries = [
  pkg.name,
  'ai context sync',
  'claude code context sync',
  'context-sync ai-rules claude-md',
  'rules-sync context-files ai-agents',
]

const githubQueries = [
  pkg.name,
  'AI context sync Claude Cursor',
  'claude code context sync pluribus-context',
]

function run(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function tryRun(command, args) {
  try {
    return { ok: true, stdout: run(command, args) }
  } catch (error) {
    return {
      ok: false,
      error: `${error.stderr?.toString?.() || error.message}`.trim(),
      stdout: `${error.stdout?.toString?.() || ''}`.trim(),
    }
  }
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function rankOf(results, selector, expected) {
  const index = results.findIndex((result) => selector(result) === expected)
  return index === -1 ? null : index
}

const metadata = parseJson(run('npm', ['view', pkg.name, 'name', 'version', 'description', 'keywords', '--json']), {})
if (metadata.name !== pkg.name) {
  throw new Error(`npm view returned ${metadata.name || 'unknown package'} instead of ${pkg.name}`)
}

const npmResults = npmQueries.map((query) => {
  const output = run('npm', ['search', query, '--json'])
  const results = parseJson(output, [])
  return {
    query,
    rank: rankOf(results, (result) => result.name, pkg.name),
    top: results.slice(0, 8).map((result) => result.name),
  }
})

const exactNameSearch = npmResults.find((result) => result.query === pkg.name)
if (!exactNameSearch || exactNameSearch.rank !== 0) {
  throw new Error(`Expected npm search ${pkg.name} to rank ${pkg.name} at position 0. Result: ${JSON.stringify(exactNameSearch)}`)
}

const githubResults = githubQueries.map((query) => {
  const result = tryRun('gh', [
    'search',
    'repos',
    query,
    '--limit',
    '8',
    '--json',
    'fullName,description,stargazersCount,url',
  ])

  if (!result.ok) {
    return { query, ok: false, error: result.error || result.stdout }
  }

  const repos = parseJson(result.stdout, [])
  return {
    query,
    ok: true,
    rank: rankOf(repos, (repo) => repo.fullName, 'caioribeiroclw-pixel/pluribus'),
    top: repos.map((repo) => ({ fullName: repo.fullName, stargazersCount: repo.stargazersCount })),
  }
})

const report = {
  package: {
    name: metadata.name,
    version: metadata.version,
    description: metadata.description,
    keywordCount: metadata.keywords?.length || 0,
  },
  npmSearch: npmResults,
  githubSearch: githubResults,
  interpretation: {
    exactNpmNameVisible: exactNameSearch.rank === 0,
    genericNpmQueriesWithPluribus: npmResults.filter((result) => result.query !== pkg.name && result.rank !== null).length,
    githubQueriesWithPluribus: githubResults.filter((result) => result.ok && result.rank !== null).length,
  },
}

console.log(JSON.stringify(report, null, 2))
