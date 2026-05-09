#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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

const npmLatest = run('npm', ['view', pkg.name, 'version'], { capture: true })
if (npmLatest.ok) {
  info('npm latest', npmLatest.output || '(none)')
  if (npmLatest.output === pkg.version) {
    console.error(`${pkg.name}@${pkg.version} already appears to be published. Bump version before publishing again.`)
    process.exit(1)
  }
} else {
  info('npm latest', `unavailable (${npmLatest.output || 'npm view failed'})`)
}

const npmUser = run('npm', ['whoami'], { capture: true })
if (npmUser.ok) {
  info('npm auth', `logged in as ${npmUser.output}`)
} else {
  info('npm auth', 'not logged in; npm publish will remain blocked until npm auth/2FA is completed')
}

required('npm test', 'npm', ['test'])
required('git diff --check', 'git', ['diff', '--check'])
required('release smoke', 'npm', ['run', 'release:smoke'])
required('npm pack --dry-run', 'npm', ['pack', '--dry-run'])
required('npm publish --dry-run', 'npm', ['publish', '--dry-run'])

console.log(`✅ release verification passed for ${pkg.name}@${pkg.version}`)
if (!npmUser.ok) {
  console.log('⚠ npm publish is still blocked by npm auth. Complete npm login/2FA, then rerun this command before publishing.')
}
