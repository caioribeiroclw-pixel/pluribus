#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repoRoot = process.cwd()
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
const packetPath = path.join(repoRoot, 'docs/community-review-packet.md')
const packageSpec = `${pkg.name}@latest`
const reviewCommands = [
  'mkdir pluribus-review && cd pluribus-review',
  `npx --yes ${packageSpec} --version`,
  `npx --yes ${packageSpec} init --dry-run --name "Review" --description "Disposable review project" --tools claude,cursor,copilot`,
  `npx --yes ${packageSpec} init --name "Review" --description "Disposable review project" --tools claude,cursor,copilot`,
  `npx --yes ${packageSpec} validate`,
  `npx --yes ${packageSpec} sync --dry-run`,
  `npx --yes ${packageSpec} audit --ci --json --output pluribus-audit.json || test $? -eq 1`,
]
const fidelityCommands = [
  'mkdir pluribus-fidelity && cd pluribus-fidelity',
  `npx --yes ${packageSpec} init --name "Fidelity review" --description "Native vs fallback smoke" --tools bob,openclaw`,
  `npx --yes ${packageSpec} sync`,
  `npx --yes ${packageSpec} audit --json --fidelity-report --output fidelity.json`,
  `node -e "const r=require('./fidelity.json'); console.log(r.fidelityReport.targets.map(t => ({ toolId: t.toolId, file: t.files[0], nativeDiscoverySurface: t.nativeDiscoverySurface, genericFallback: t.genericFallback, manualActivationRequired: t.manualActivationRequired, effectiveContextScope: t.effectiveContext?.scope })))"`,
]

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    ...options,
  })
}

function runAllowFailure(command, args, options = {}) {
  try {
    const stdout = run(command, args, { ...options, capture: true })
    return { status: 0, stdout, stderr: '' }
  } catch (error) {
    return {
      status: error.status ?? 1,
      stdout: error.stdout?.toString?.() ?? '',
      stderr: error.stderr?.toString?.() ?? '',
    }
  }
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label} did not include ${JSON.stringify(expected)}. Output:\n${value}`)
  }
}

function assertFileExists(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} did not create ${filePath}`)
  }
}

function assertFileMissing(filePath, label) {
  if (existsSync(filePath)) {
    throw new Error(`${label} unexpectedly created ${filePath}`)
  }
}

function assertPacketDocumentsSmoke() {
  const packet = readFileSync(packetPath, 'utf8')
  assertIncludes(packet, '## 60-second review smoke', 'community review packet')
  assertIncludes(packet, '## 60-second native-vs-fallback smoke', 'community review packet')
  for (const command of [...reviewCommands, ...fidelityCommands]) {
    assertIncludes(packet, command, 'community review packet smoke command')
  }
}

assertPacketDocumentsSmoke()

const latestVersion = run('npm', ['view', pkg.name, 'version'], { capture: true }).trim()
if (!latestVersion) {
  throw new Error(`Could not resolve npm latest version for ${pkg.name}`)
}

let smokeDir

try {
  smokeDir = mkdtempSync(path.join(tmpdir(), 'pluribus-review-smoke-'))
  const reviewDir = path.join(smokeDir, 'pluribus-review')
  mkdirSync(reviewDir)

  const versionOutput = run('npx', ['--yes', packageSpec, '--version'], { cwd: reviewDir, capture: true }).trim()
  if (versionOutput !== latestVersion) {
    throw new Error(`Expected review smoke --version to be ${latestVersion}, got ${versionOutput}`)
  }

  const initPreview = run(
    'npx',
    [
      '--yes',
      packageSpec,
      'init',
      '--dry-run',
      '--name',
      'Review',
      '--description',
      'Disposable review project',
      '--tools',
      'claude,cursor,copilot',
    ],
    { cwd: reviewDir, capture: true },
  )
  assertIncludes(initPreview, 'Preview only — no files were written', 'review smoke init --dry-run')
  assertFileMissing(path.join(reviewDir, 'pluribus.md'), 'review smoke init --dry-run')

  const initOutput = run(
    'npx',
    [
      '--yes',
      packageSpec,
      'init',
      '--name',
      'Review',
      '--description',
      'Disposable review project',
      '--tools',
      'claude,cursor,copilot',
    ],
    { cwd: reviewDir, capture: true },
  )
  assertIncludes(initOutput, 'pluribus.md created', 'review smoke init')
  assertFileExists(path.join(reviewDir, 'pluribus.md'), 'review smoke init')

  const validateOutput = run('npx', ['--yes', packageSpec, 'validate'], { cwd: reviewDir, capture: true })
  assertIncludes(validateOutput, 'pluribus.md is valid', 'review smoke validate')

  const syncPreview = run('npx', ['--yes', packageSpec, 'sync', '--dry-run'], { cwd: reviewDir, capture: true })
  assertIncludes(syncPreview, `Generated by Pluribus ${latestVersion}`, 'review smoke sync --dry-run')
  assertFileMissing(path.join(reviewDir, 'CLAUDE.md'), 'review smoke sync --dry-run')
  assertFileMissing(path.join(reviewDir, '.cursorrules'), 'review smoke sync --dry-run')
  assertFileMissing(path.join(reviewDir, '.github/copilot-instructions.md'), 'review smoke sync --dry-run')

  const audit = runAllowFailure(
    'npx',
    ['--yes', packageSpec, 'audit', '--ci', '--json', '--output', 'pluribus-audit.json'],
    { cwd: reviewDir },
  )
  if (audit.status !== 1) {
    throw new Error(`Expected review smoke audit to exit 1 before generated files are synced, got ${audit.status}`)
  }
  if (audit.stdout.trim()) {
    throw new Error(`Expected review smoke audit --output to keep stdout empty. Output:\n${audit.stdout}`)
  }
  assertIncludes(audit.stderr, '::error file=CLAUDE.md', 'review smoke audit annotations')
  assertIncludes(audit.stderr, '::error file=.cursorrules', 'review smoke audit annotations')
  assertIncludes(audit.stderr, '::error file=.github/copilot-instructions.md', 'review smoke audit annotations')

  const auditJsonPath = path.join(reviewDir, 'pluribus-audit.json')
  assertFileExists(auditJsonPath, 'review smoke audit --output')
  const auditJson = JSON.parse(readFileSync(auditJsonPath, 'utf8'))
  if (auditJson.ok !== false || auditJson.summary?.missing !== 3 || auditJson.results?.length !== 3) {
    throw new Error(`Unexpected review smoke audit JSON:\n${JSON.stringify(auditJson, null, 2)}`)
  }
  assertIncludes(auditJson.feedback || '', 'issues/new?template=audit-feedback.yml', 'review smoke audit feedback URL')

  const fidelityDir = path.join(smokeDir, 'pluribus-fidelity')
  mkdirSync(fidelityDir)

  const fidelityInit = run(
    'npx',
    [
      '--yes',
      packageSpec,
      'init',
      '--name',
      'Fidelity review',
      '--description',
      'Native vs fallback smoke',
      '--tools',
      'bob,openclaw',
    ],
    { cwd: fidelityDir, capture: true },
  )
  assertIncludes(fidelityInit, 'pluribus.md created', 'native-vs-fallback smoke init')

  const fidelitySync = run('npx', ['--yes', packageSpec, 'sync'], { cwd: fidelityDir, capture: true })
  assertIncludes(fidelitySync, '.bob/rules/pluribus.md', 'native-vs-fallback smoke sync')
  assertIncludes(fidelitySync, 'AGENTS.md', 'native-vs-fallback smoke sync')
  assertFileExists(path.join(fidelityDir, '.bob/rules/pluribus.md'), 'native-vs-fallback smoke sync')
  assertFileExists(path.join(fidelityDir, 'AGENTS.md'), 'native-vs-fallback smoke sync')

  const fidelityAudit = run(
    'npx',
    ['--yes', packageSpec, 'audit', '--json', '--fidelity-report', '--output', 'fidelity.json'],
    { cwd: fidelityDir, capture: true },
  )
  if (fidelityAudit.trim()) {
    throw new Error(`Expected native-vs-fallback audit --output to keep stdout empty. Output:
${fidelityAudit}`)
  }
  const fidelityJsonPath = path.join(fidelityDir, 'fidelity.json')
  assertFileExists(fidelityJsonPath, 'native-vs-fallback smoke audit --output')
  const fidelityJson = JSON.parse(readFileSync(fidelityJsonPath, 'utf8'))
  const targetById = Object.fromEntries((fidelityJson.fidelityReport?.targets || []).map((target) => [target.toolId, target]))

  const bob = targetById.bob
  if (!bob) {
    throw new Error(`Expected fidelity report to include Bob target:
${JSON.stringify(fidelityJson, null, 2)}`)
  }
  if (bob.nativeDiscoverySurface !== '.bob/rules/*.md' || bob.genericFallback !== false || bob.manualActivationRequired !== false) {
    throw new Error(`Unexpected Bob fidelity fields:
${JSON.stringify(bob, null, 2)}`)
  }
  if (bob.files?.[0] !== '.bob/rules/pluribus.md') {
    throw new Error(`Unexpected Bob target file:
${JSON.stringify(bob, null, 2)}`)
  }

  const openclaw = targetById.openclaw
  if (!openclaw) {
    throw new Error(`Expected fidelity report to include OpenClaw target:
${JSON.stringify(fidelityJson, null, 2)}`)
  }
  if (openclaw.nativeDiscoverySurface !== 'AGENTS.md' || openclaw.genericFallback !== true || openclaw.manualActivationRequired !== false) {
    throw new Error(`Unexpected OpenClaw fidelity fields:
${JSON.stringify(openclaw, null, 2)}`)
  }
  if (openclaw.files?.[0] !== 'AGENTS.md') {
    throw new Error(`Unexpected OpenClaw target file:
${JSON.stringify(openclaw, null, 2)}`)
  }

  console.log(`✅ community review packet smoke passed for ${pkg.name}@latest (${latestVersion})`)
} finally {
  if (smokeDir) {
    rmSync(smokeDir, { recursive: true, force: true })
  }
}
