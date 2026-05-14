#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { BUILT_IN_SKILLS, SUPPORTED_TOOLS } from '../src/skills/built-in.js'

const repoRoot = process.cwd()
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
const packageSpec = `${pkg.name}@latest`
const auditFeedbackUrl = 'https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=audit-feedback.yml'
const supportedToolsHelp = `--tools         Comma-separated list of tools to enable (${SUPPORTED_TOOLS.join(',')})`

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    ...options,
  })
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label} did not include ${JSON.stringify(expected)}. Output:\n${value}`)
  }
}

function assertNotIncludes(value, unexpected, label) {
  if (value.includes(unexpected)) {
    throw new Error(`${label} unexpectedly included ${JSON.stringify(unexpected)}. Output:\n${value}`)
  }
}

function assertPublishedReadme(latestVersion) {
  if (!versionAtLeast(latestVersion, '0.3.1')) return

  const readme = run('npm', ['view', pkg.name, 'readme'], { capture: true })
  assertIncludes(readme, 'npx --yes pluribus-context@latest audit', 'published npm README')
  assertIncludes(readme, 'npx --yes pluribus-context@latest sync --dry-run', 'published npm README')
  assertIncludes(readme, '60-second smoke test', 'published npm README')
  assertIncludes(readme, 'img.shields.io/npm/dw/pluribus-context', 'published npm README')
  assertIncludes(readme, 'img.shields.io/github/actions/workflow/status/caioribeiroclw-pixel/pluribus/ci.yml', 'published npm README')
  assertIncludes(readme, 'issues/new?template=quickstart-feedback.yml', 'published npm README')
  assertIncludes(readme, 'issues/new?template=audit-feedback.yml', 'published npm README')
  assertIncludes(readme, 'When to use Pluribus](docs/when-to-use-pluribus.md)', 'published npm README')
  assertIncludes(readme, 'one-way rules converter', 'published npm README')
  assertIncludes(readme, 'What Pluribus writes', 'published npm README')
  assertIncludes(readme, '`audit`, `validate`, and `sync --dry-run` are read-only', 'published npm README')
  assertIncludes(readme, '`init` writes `pluribus.md` only', 'published npm README')
  assertIncludes(readme, '`sync` writes only the configured/generated AI context files', 'published npm README')
  for (const outputPath of [
    '`CLAUDE.md`',
    '`.cursorrules`',
    '`.github/copilot-instructions.md`',
    '`AGENTS.md`',
    '`.windsurf/rules/pluribus.md`',
    '`.continue/rules/pluribus.md`',
    '`.rules`',
  ]) {
    assertIncludes(readme, outputPath, 'published npm README supported tool outputs')
  }
  assertNotIncludes(readme, 'npx pluribus-context init', 'published npm README')
  assertNotIncludes(readme, 'npx pluribus-context sync', 'published npm README')

  if (versionAtLeast(latestVersion, '0.3.4')) {
    assertNotIncludes(readme, 'github:caioribeiroclw-pixel/pluribus#v0.3.3', 'published npm README')
    assertNotIncludes(readme, 'npm latest remains 0.3.0', 'published npm README')
    assertNotIncludes(readme, 'npm `latest` still resolves to `0.3.0`', 'published npm README')
  }
}

function assertPublishedDiscoveryMetadata(latestVersion) {
  if (!versionAtLeast(latestVersion, '0.3.1')) return

  const metadata = JSON.parse(run('npm', ['view', pkg.name, 'description', 'keywords', '--json'], { capture: true }))
  const description = (metadata.description || '').toLowerCase()
  const requiredDescriptionTerms = ['ai context', 'rules', 'claude code', 'cursor', 'copilot']
  for (const term of requiredDescriptionTerms) {
    assertIncludes(description, term, 'published npm description')
  }

  const keywords = new Set(metadata.keywords || [])
  const requiredKeywords = ['ai-context', 'agent-rules', 'claude-code', 'cursor-rules', 'copilot', 'codex', 'aider', 'drift-detection']
  const missingKeywords = requiredKeywords.filter((keyword) => !keywords.has(keyword))
  if (missingKeywords.length > 0) {
    throw new Error(`published npm keywords missing: ${missingKeywords.join(', ')}`)
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

function assertAllSupportedToolOutputs(projectDir, label) {
  for (const tool of SUPPORTED_TOOLS) {
    const outputFiles = BUILT_IN_SKILLS[tool].outputFiles || []
    for (const outputFile of outputFiles) {
      assertFileExists(path.join(projectDir, outputFile), `${label} ${tool}`)
    }
  }
}

function assertFails(command, args, expected, options = {}) {
  try {
    run(command, args, { ...options, capture: true })
  } catch (error) {
    const output = `${error.stdout?.toString?.() ?? ''}${error.stderr?.toString?.() ?? ''}`
    assertIncludes(output, expected, `${command} ${args.join(' ')}`)
    return output
  }
  throw new Error(`${command} ${args.join(' ')} unexpectedly succeeded`)
}

function versionAtLeast(actual, expected) {
  const actualParts = actual.split('.').map((value) => Number.parseInt(value, 10) || 0)
  const expectedParts = expected.split('.').map((value) => Number.parseInt(value, 10) || 0)
  for (let index = 0; index < Math.max(actualParts.length, expectedParts.length); index += 1) {
    const actualPart = actualParts[index] || 0
    const expectedPart = expectedParts[index] || 0
    if (actualPart > expectedPart) return true
    if (actualPart < expectedPart) return false
  }
  return true
}

const latestVersion = run('npm', ['view', pkg.name, 'version'], { capture: true }).trim()
if (!latestVersion) {
  throw new Error(`Could not resolve npm latest version for ${pkg.name}`)
}
assertPublishedReadme(latestVersion)
assertPublishedDiscoveryMetadata(latestVersion)

let smokeDir

try {
  smokeDir = mkdtempSync(path.join(tmpdir(), 'pluribus-published-smoke-'))

  const versionOutput = run('npx', ['--yes', '--package', packageSpec, 'pluribus', '--version'], {
    cwd: smokeDir,
    capture: true,
  }).trim()
  if (versionOutput !== latestVersion) {
    throw new Error(`Expected published pluribus --version to be ${latestVersion}, got ${versionOutput}`)
  }

  const helpOutput = run('npx', ['--yes', '--package', packageSpec, 'pluribus', '--help'], {
    cwd: smokeDir,
    capture: true,
  })
  assertIncludes(helpOutput, `Pluribus v${latestVersion}`, 'published pluribus --help')
  if (versionAtLeast(latestVersion, '0.3.1')) {
    assertIncludes(helpOutput, supportedToolsHelp, 'published pluribus --help supported tools')
  }

  if (versionAtLeast(latestVersion, '0.3.1')) {
    assertFails(
      'npx',
      ['--yes', '--package', packageSpec, 'pluribus', 'init', '--dryrun'],
      'Unknown option for `init`: --dryrun',
      { cwd: smokeDir },
    )
    assertFileMissing(path.join(smokeDir, 'pluribus.md'), 'published pluribus unknown-flag smoke')
  }

  run('node', ['-e', "require('fs').writeFileSync('CLAUDE.md', '# Claude context\\n'); require('fs').writeFileSync('.cursorrules', '# Cursor rules\\n')"], {
    cwd: smokeDir,
    capture: true,
  })
  const auditOutput = run('npx', ['--yes', '--package', packageSpec, 'pluribus', 'audit'], {
    cwd: smokeDir,
    capture: true,
  })
  assertIncludes(auditOutput, 'No pluribus.md found', 'published pluribus audit without source')
  assertIncludes(auditOutput, 'CLAUDE.md', 'published pluribus audit without source')
  assertIncludes(auditOutput, '.cursorrules', 'published pluribus audit without source')
  if (versionAtLeast(latestVersion, '0.3.1')) {
    assertIncludes(auditOutput, auditFeedbackUrl, 'published pluribus audit without source')
  }

  const initOutput = run(
    'npx',
    [
      '--yes',
      '--package',
      packageSpec,
      'pluribus',
      'init',
      '--name',
      'Ana',
      '--description',
      'A Node.js service',
      '--tools',
      'claude,cursor,copilot',
    ],
    { cwd: smokeDir, capture: true },
  )
  assertIncludes(initOutput, 'pluribus.md created', 'published pluribus init')
  assertFileExists(path.join(smokeDir, 'pluribus.md'), 'published pluribus init')

  const validateOutput = run('npx', ['--yes', '--package', packageSpec, 'pluribus', 'validate'], {
    cwd: smokeDir,
    capture: true,
  })
  assertIncludes(validateOutput, 'pluribus.md is valid', 'published pluribus validate')

  const syncDryRunOutput = run('npx', ['--yes', '--package', packageSpec, 'pluribus', 'sync', '--dry-run'], {
    cwd: smokeDir,
    capture: true,
  })
  assertIncludes(syncDryRunOutput, `Generated by Pluribus ${latestVersion}`, 'published pluribus sync --dry-run')

  if (versionAtLeast(latestVersion, '0.3.1')) {
    const allToolsDir = path.join(smokeDir, 'all-supported-tools')
    mkdirSync(allToolsDir)
    run(
      'npx',
      [
        '--yes',
        '--package',
        packageSpec,
        'pluribus',
        'init',
        '--name',
        'Ana',
        '--description',
        'A Node.js service',
        '--tools',
        SUPPORTED_TOOLS.join(','),
      ],
      { cwd: allToolsDir, capture: true },
    )
    const allToolsSync = run('npx', ['--yes', '--package', packageSpec, 'pluribus', 'sync'], {
      cwd: allToolsDir,
      capture: true,
    })
    for (const tool of SUPPORTED_TOOLS) {
      assertIncludes(allToolsSync, `[${tool}]`, 'published pluribus sync all supported tools')
    }
    assertAllSupportedToolOutputs(allToolsDir, 'published pluribus sync all supported tools')
  }

  console.log(`✅ published smoke passed for ${pkg.name}@${latestVersion}`)
} finally {
  if (smokeDir) rmSync(smokeDir, { recursive: true, force: true })
}
