#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))

function run(command, args, options = {}) {
  try {
    const output = execFileSync(command, args, {
      cwd: options.cwd || repoRoot,
      encoding: 'utf8',
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'pipe',
      ...options,
    })
    return { ok: true, output: output?.trim?.() ?? '' }
  } catch (error) {
    const stdout = error.stdout?.toString?.() ?? ''
    const stderr = error.stderr?.toString?.() ?? ''
    return {
      ok: false,
      status: error.status,
      output: `${stdout}${stderr}`.trim(),
    }
  }
}

function required(label, command, args) {
  process.stdout.write(`▶ ${label}... `)
  const result = run(command, args, { stdio: 'pipe', encoding: 'utf8', capture: true })
  if (!result.ok) {
    console.log('failed')
    if (result.output) console.error(result.output)
    process.exit(result.status || 1)
  }
  console.log('ok')
  return result.output
}

function info(label, value) {
  console.log(`ℹ ${label}: ${value}`)
}

function describeNpmAuthFailure(output) {
  const normalized = output.toLowerCase()
  if (normalized.includes('token seems to be invalid') || normalized.includes('unable to authenticate')) {
    return 'invalid/stale npm auth token configured; run npm logout, then npm login/2FA or use a fresh temporary publish token'
  }
  if (normalized.includes('not logged in') || normalized.includes('eneedauth') || normalized.includes('e401')) {
    return 'not logged in; npm publish will remain blocked until npm auth/2FA is completed'
  }
  return 'unavailable; npm publish will remain blocked until npm auth/2FA is completed'
}

function walkFiles(paths) {
  const files = []
  for (const entry of paths) {
    const fullPath = path.join(repoRoot, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      for (const child of readdirSync(fullPath)) {
        files.push(...walkFiles([path.join(entry, child)]))
      }
    } else if (stat.isFile()) {
      files.push(fullPath)
    }
  }
  return files
}

const copyPastePaths = ['README.md', 'CONTRIBUTING.md', 'docs', 'examples', '.github/ISSUE_TEMPLATE']

function scanCopyPasteCommands(paths, callback) {
  const offenders = []

  for (const file of walkFiles(paths)) {
    const relativePath = path.relative(repoRoot, file)
    const text = readFileSync(file, 'utf8')
    text.split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim()
      callback(trimmed, relativePath, index + 1, offenders)
    })
  }

  return offenders
}

function assertExplicitPublishedNpxCopyPaste() {
  const offenders = scanCopyPasteCommands(copyPastePaths, (trimmed, relativePath, lineNumber, matches) => {
    if (/^(?:run:\s*)?npx --yes pluribus-context\s+/.test(trimmed)) {
      matches.push(`${relativePath}:${lineNumber}: ${trimmed}`)
    }
  })

  if (offenders.length > 0) {
    console.error(
      'Found published npx copy-paste commands without @latest:\n' +
        offenders.join('\n') +
        '\nUse `npx --yes pluribus-context@latest ...` so docs, examples, and issue templates are reproducible.',
    )
    process.exit(1)
  }
}

function assertNoUnreleasedNpmCopyPaste(npmLatestVersion) {
  if (!npmLatestVersion || npmLatestVersion === pkg.version) return

  const patterns = [
    /^(?:run:\s*)?npx --yes pluribus-context(?:@latest)?\s+audit\b[^\n]*(?:--ci|--json|--output|--github-annotations)/,
    /^(?:run:\s*)?npx --yes pluribus-context(?:@latest)?\s+init\b[^\n]*--dry-run/,
    /^(?:run:\s*)?pluribus\s+audit\b[^\n]*(?:--ci|--json|--output|--github-annotations)/,
    /^(?:run:\s*)?pluribus\s+init\b[^\n]*--dry-run/,
  ]
  const sourceInstall = '--package github:caioribeiroclw-pixel/pluribus#main'
  const checkedPaths = [...copyPastePaths, 'CHANGELOG.md']
  const offenders = scanCopyPasteCommands(checkedPaths, (trimmed, relativePath, lineNumber, matches) => {
    if (trimmed.includes(sourceInstall)) return
    if (patterns.some((pattern) => pattern.test(trimmed))) {
      matches.push(`${relativePath}:${lineNumber}: ${trimmed}`)
    }
  })

  if (offenders.length > 0) {
    console.error(
      `Found unreleased ${pkg.name}@${pkg.version} copy-paste commands while npm latest is still ${npmLatestVersion}:\n` +
        offenders.join('\n') +
        '\nUse an explicit github:caioribeiroclw-pixel/pluribus#main source install until the npm patch is published.',
    )
    process.exit(1)
  }
}

const gitStatus = required('git status', 'git', ['status', '--short', '--branch'])
if (!gitStatus.startsWith('## main...origin/main')) {
  console.error(`Expected clean main tracking origin/main. Got:\n${gitStatus}`)
  process.exit(1)
}
const dirtyLines = gitStatus.split(/\r?\n/).filter((line) => line && !line.startsWith('##'))
if (dirtyLines.length > 0) {
  console.error(`Working tree is not clean:\n${gitStatus}`)
  process.exit(1)
}

info('package', `${pkg.name}@${pkg.version}`)
assertExplicitPublishedNpxCopyPaste()

const npmLatest = run('npm', ['view', pkg.name, 'version'], { capture: true })
if (npmLatest.ok) {
  info('npm latest', npmLatest.output || '(none)')
  if (npmLatest.output === pkg.version) {
    console.error(`${pkg.name}@${pkg.version} already appears to be published. Bump version before publishing again.`)
    process.exit(1)
  }
  assertNoUnreleasedNpmCopyPaste(npmLatest.output)
  required('published npm smoke', 'npm', ['run', 'published:smoke'])
} else {
  info('npm latest', `unavailable (${npmLatest.output || 'npm view failed'}); skipping published npm smoke`)
}

const npmUser = run('npm', ['whoami'], { capture: true })
const npmAuthFailure = npmUser.ok ? '' : describeNpmAuthFailure(npmUser.output)
if (npmUser.ok) {
  info('npm auth', `logged in as ${npmUser.output}`)
} else {
  info('npm auth', npmAuthFailure)
}

required('npm test', 'npm', ['test'])
required('git diff --check', 'git', ['diff', '--check'])
required('release smoke', 'npm', ['run', 'release:smoke'])
required('npm pack --dry-run', 'npm', ['pack', '--dry-run'])
required('npm publish --dry-run', 'npm', ['publish', '--dry-run'])

console.log(`✅ release verification passed for ${pkg.name}@${pkg.version}`)
if (!npmUser.ok) {
  console.log(`⚠ npm publish is still blocked by npm auth: ${npmAuthFailure}. Rerun this command before publishing.`)
}
