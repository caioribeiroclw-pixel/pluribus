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

function assertExplicitPublishedInstallCopyPaste() {
  const offenders = scanCopyPasteCommands(copyPastePaths, (trimmed, relativePath, lineNumber, matches) => {
    if (/^(?:run:\s*)?npx --yes pluribus-context\s+/.test(trimmed)) {
      matches.push(`${relativePath}:${lineNumber}: ${trimmed}`)
    }
    if (/^(?:run:\s*)?npm install -g pluribus-context(?:\s|$)/.test(trimmed)) {
      matches.push(`${relativePath}:${lineNumber}: ${trimmed}`)
    }
  })

  if (offenders.length > 0) {
    console.error(
      'Found published npm copy-paste commands without @latest:\n' +
        offenders.join('\n') +
        '\nUse `npx --yes pluribus-context@latest ...` or `npm install -g pluribus-context@latest` so docs, examples, and issue templates are reproducible.',
    )
    process.exit(1)
  }
}

function assertFeedbackIssueLinks() {
  const requiredLinks = [
    { file: 'README.md', link: 'issues/new?template=quickstart-feedback.yml' },
    { file: 'README.md', link: 'issues/new?template=audit-feedback.yml' },
    { file: 'CONTRIBUTING.md', link: 'issues/new?template=quickstart-feedback.yml' },
    { file: 'CONTRIBUTING.md', link: 'issues/new?template=audit-feedback.yml' },
    { file: 'docs/quickstart.md', link: 'issues/new?template=quickstart-feedback.yml' },
    { file: 'docs/quickstart.md', link: 'issues/new?template=audit-feedback.yml' },
    { file: 'docs/context-drift-audit.md', link: 'issues/new?template=audit-feedback.yml' },
  ]

  const missing = requiredLinks.filter(({ file, link }) => !readFileSync(path.join(repoRoot, file), 'utf8').includes(link))
  if (missing.length > 0) {
    console.error(
      'Missing first-run feedback issue links:\n' +
        missing.map(({ file, link }) => `${file}: ${link}`).join('\n') +
        '\nKeep docs pointed at concrete issue templates so first-run feedback is structured.',
    )
    process.exit(1)
  }
}

function readPackageFileList() {
  const output = run('npm', ['pack', '--dry-run', '--json'], { capture: true })
  if (!output.ok) {
    console.error(`Could not inspect npm package file list:\n${output.output}`)
    process.exit(output.status || 1)
  }

  try {
    const [packument] = JSON.parse(output.output)
    return new Set((packument.files || []).map((file) => file.path))
  } catch (error) {
    console.error(`Could not parse npm pack --dry-run --json output:\n${output.output}`)
    process.exit(1)
  }
}

function extractMarkdownLinks(markdown) {
  const links = []
  const linkPattern = /(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  let match
  while ((match = linkPattern.exec(markdown)) !== null) {
    links.push(match[1])
  }
  return links
}

function assertPackagedMarkdownRelativeLinks() {
  const packageFiles = readPackageFileList()
  const markdownFiles = [...packageFiles].filter((file) => file.endsWith('.md'))
  const missing = []

  for (const markdownFile of markdownFiles) {
    const markdownPath = path.join(repoRoot, markdownFile)
    const markdown = readFileSync(markdownPath, 'utf8')
    const baseDir = path.posix.dirname(markdownFile)

    for (const link of extractMarkdownLinks(markdown)) {
      if (/^(?:https?:|mailto:|#)/i.test(link)) continue
      const [target] = link.split('#')
      if (!target || target.startsWith('#')) continue

      const normalizedTarget = path.posix.normalize(path.posix.join(baseDir, target))
      if (normalizedTarget.startsWith('..')) {
        missing.push(`${markdownFile}: ${link} (escapes package root)`)
        continue
      }

      const targetPrefix = normalizedTarget.endsWith('/') ? normalizedTarget : `${normalizedTarget}/`
      const targetExists = packageFiles.has(normalizedTarget) || [...packageFiles].some((file) => file.startsWith(targetPrefix))
      if (!targetExists) {
        missing.push(`${markdownFile}: ${link}`)
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      'Packaged Markdown has relative links to files/directories that are not included in the npm package:\n' +
        missing.join('\n') +
        '\nKeep README/docs/spec/example links usable by adding linked files to package.json files or using absolute GitHub URLs.',
    )
    process.exit(1)
  }
}

function assertFirstRunWriteSafetyCopy() {
  const requiredSnippets = [
    { file: 'README.md', snippet: '### What Pluribus writes' },
    { file: 'README.md', snippet: '`audit`, `validate`, and `sync --dry-run` are read-only' },
    { file: 'README.md', snippet: '`init` writes `pluribus.md` only' },
    { file: 'README.md', snippet: '`sync` writes only the configured/generated AI context files' },
    { file: 'README.md', snippet: 'Remote imports only touch `pluribus.lock.json` and `.pluribus/cache/remote/` when you explicitly pass `--update-imports`' },
    { file: 'docs/quickstart.md', snippet: '## What Pluribus writes' },
    { file: 'docs/quickstart.md', snippet: 'audit → validate → `sync --dry-run` → `sync`' },
    { file: 'docs/quickstart.md', snippet: 'Remote imports do not refresh silently' },
  ]

  const missing = requiredSnippets.filter(({ file, snippet }) => !readFileSync(path.join(repoRoot, file), 'utf8').includes(snippet))
  if (missing.length > 0) {
    console.error(
      'Missing first-run write-safety copy:\n' +
        missing.map(({ file, snippet }) => `${file}: ${snippet}`).join('\n') +
        '\nKeep the write surface explicit so users can try Pluribus safely before syncing.',
    )
    process.exit(1)
  }
}


const supportedToolOutputSnippets = [
  '`CLAUDE.md`',
  '`.cursorrules`',
  '`.github/copilot-instructions.md`',
  '`AGENTS.md`',
  '`.windsurf/rules/pluribus.md`',
  '`.continue/rules/pluribus.md`',
  '`.rules`',
]

function assertReadmeSupportedToolsCopy() {
  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8')
  const missing = supportedToolOutputSnippets.filter((snippet) => !readme.includes(snippet))
  if (missing.length > 0) {
    console.error(
      'README is missing supported tool output copy:\n' +
        missing.join('\n') +
        '\nKeep the GitHub/npm landing page aligned with the full built-in adapter list before publishing.',
    )
    process.exit(1)
  }
}

function assertQuickstartSupportedToolsCopy() {
  const quickstart = readFileSync(path.join(repoRoot, 'docs/quickstart.md'), 'utf8')
  const requiredSnippets = [
    '| `claude` | `CLAUDE.md` |',
    '| `cursor` | `.cursorrules` |',
    '| `copilot` | `.github/copilot-instructions.md` |',
    '| `openclaw` | `AGENTS.md` |',
    '| `windsurf` | `.windsurf/rules/pluribus.md` |',
    '| `continue` | `.continue/rules/pluribus.md` |',
    '| `zed` | `.rules` |',
    'npx --yes pluribus-context@latest --help',
  ]
  const missing = requiredSnippets.filter((snippet) => !quickstart.includes(snippet))
  if (missing.length > 0) {
    console.error(
      'Quickstart is missing supported tool adapter copy:\n' +
        missing.join('\n') +
        '\nKeep the first-run docs aligned with the full built-in adapter list so users can discover their tool before trying sync.',
    )
    process.exit(1)
  }
}



function assertContributingSupportedToolsCopy() {
  const contributing = readFileSync(path.join(repoRoot, 'CONTRIBUTING.md'), 'utf8')
  const requiredSnippets = [
    '| `claude` | `CLAUDE.md` |',
    '| `cursor` | `.cursorrules` |',
    '| `copilot` | `.github/copilot-instructions.md` |',
    '| `openclaw` | `AGENTS.md` |',
    '| `windsurf` | `.windsurf/rules/pluribus.md` |',
    '| `continue` | `.continue/rules/pluribus.md` |',
    '| `zed` | `.rules` |',
    'issues/new?template=integration-request.yml',
  ]
  const missing = requiredSnippets.filter((snippet) => !contributing.includes(snippet))
  if (missing.length > 0) {
    console.error(
      'CONTRIBUTING.md is missing supported adapter / integration request copy:\n' +
        missing.join('\n') +
        '\nKeep contributor guidance aligned with built-in adapter coverage so users do not request already-supported tools.',
    )
    process.exit(1)
  }
}

function issueTemplatePaths() {
  return readdirSync(path.join(repoRoot, '.github/ISSUE_TEMPLATE'))
    .filter((file) => file.endsWith('.yml') && file !== 'config.yml')
    .map((file) => `.github/ISSUE_TEMPLATE/${file}`)
}

function assertIssueTemplateVersionPlaceholders() {
  const templatePaths = [
    '.github/ISSUE_TEMPLATE/quickstart-feedback.yml',
    '.github/ISSUE_TEMPLATE/bug-report.yml',
    '.github/ISSUE_TEMPLATE/audit-feedback.yml',
  ]
  const offenders = []

  for (const templatePath of templatePaths) {
    const text = readFileSync(path.join(repoRoot, templatePath), 'utf8')
    const versionBlock = text.match(/label: Pluribus version[\s\S]*?(?=\n  - type:|$)/)?.[0] || ''
    if (!versionBlock.includes('placeholder: "Paste the exact --version output"')) {
      offenders.push(`${templatePath}: missing exact --version placeholder`)
    }
    const semverPlaceholder = versionBlock.match(/placeholder:\s*["']?v?\d+\.\d+\.\d+["']?/)
    if (semverPlaceholder) {
      offenders.push(`${templatePath}: stale hard-coded version placeholder (${semverPlaceholder[0]})`)
    }
  }

  if (offenders.length > 0) {
    console.error(
      'Issue templates should ask for exact --version output instead of hard-coded package versions:\n' +
        offenders.join('\n') +
        '\nKeep first-run reports accurate while npm latest and main may differ during release prep.',
    )
    process.exit(1)
  }
}

function assertIssueTemplateLinksResolvable() {
  const templateFiles = new Set(issueTemplatePaths().map((templatePath) => path.basename(templatePath)))
  const templateLinkPattern = /https:\/\/github\.com\/caioribeiroclw-pixel\/pluribus\/issues\/new\?template=([a-z0-9-]+\.yml)/gi
  const badLinks = []
  const linkedTemplates = new Set()

  for (const file of walkFiles(copyPastePaths)) {
    const relativePath = path.relative(repoRoot, file)
    const text = readFileSync(file, 'utf8')
    let match
    while ((match = templateLinkPattern.exec(text)) !== null) {
      const template = match[1]
      linkedTemplates.add(template)
      if (!templateFiles.has(template)) {
        badLinks.push(`${relativePath}: issues/new?template=${template}`)
      }
    }
  }

  const unlinkedTemplates = [...templateFiles].filter((template) => !linkedTemplates.has(template))
  if (badLinks.length > 0 || unlinkedTemplates.length > 0) {
    const messages = []
    if (badLinks.length > 0) messages.push(`Broken issue-template links:\n${badLinks.join('\n')}`)
    if (unlinkedTemplates.length > 0) messages.push(`Issue templates with no public docs link:\n${unlinkedTemplates.join('\n')}`)
    console.error(
      messages.join('\n') +
        '\nKeep README/docs/CONTRIBUTING feedback links aligned with .github/ISSUE_TEMPLATE so first-run users land on working forms.',
    )
    process.exit(1)
  }
}

function assertReadmeTrustBadges() {
  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8')
  const requiredBadges = [
    'img.shields.io/npm/v/pluribus-context',
    'img.shields.io/npm/dw/pluribus-context',
    'img.shields.io/github/actions/workflow/status/caioribeiroclw-pixel/pluribus/ci.yml',
    'github.com/caioribeiroclw-pixel/pluribus/actions/workflows/ci.yml',
  ]
  const missing = requiredBadges.filter((badge) => !readme.includes(badge))
  if (missing.length > 0) {
    console.error(
      'README is missing package trust/distribution badges:\n' +
        missing.join('\n') +
        '\nKeep npm version/downloads and CI status visible on GitHub and the npm package page.',
    )
    process.exit(1)
  }
}

function assertPackageDiscoveryMetadata() {
  const description = pkg.description.toLowerCase()
  const requiredDescriptionTerms = ['ai context', 'rules', 'claude code', 'cursor', 'copilot']
  const missingDescriptionTerms = requiredDescriptionTerms.filter((term) => !description.includes(term))

  const keywords = new Set(pkg.keywords || [])
  const requiredKeywords = ['ai-context', 'agent-rules', 'claude-code', 'cursor-rules', 'copilot', 'codex', 'aider', 'drift-detection']
  const missingKeywords = requiredKeywords.filter((keyword) => !keywords.has(keyword))

  if (missingDescriptionTerms.length > 0 || missingKeywords.length > 0) {
    const messages = []
    if (missingDescriptionTerms.length > 0) messages.push(`description missing: ${missingDescriptionTerms.join(', ')}`)
    if (missingKeywords.length > 0) messages.push(`keywords missing: ${missingKeywords.join(', ')}`)
    console.error(
      'Package discovery metadata is missing core npm search terms:\n' +
        messages.join('\n') +
        '\nKeep package.json aligned with adjacent AI context/rules searches before publishing.',
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
const runningInCi = process.env.CI === 'true'
if (!runningInCi && !gitStatus.startsWith('## main...origin/main')) {
  console.error(`Expected clean main tracking origin/main. Got:\n${gitStatus}`)
  process.exit(1)
}
const dirtyLines = gitStatus.split(/\r?\n/).filter((line) => line && !line.startsWith('##'))
if (dirtyLines.length > 0) {
  console.error(`Working tree is not clean:\n${gitStatus}`)
  process.exit(1)
}
if (runningInCi) {
  info('git ref', gitStatus.split(/\r?\n/)[0] || '(unknown)')
}

info('package', `${pkg.name}@${pkg.version}`)
assertPackageDiscoveryMetadata()
assertReadmeTrustBadges()
assertFirstRunWriteSafetyCopy()
assertReadmeSupportedToolsCopy()
assertQuickstartSupportedToolsCopy()
assertContributingSupportedToolsCopy()
assertIssueTemplateVersionPlaceholders()
assertIssueTemplateLinksResolvable()
assertExplicitPublishedInstallCopyPaste()
assertFeedbackIssueLinks()
assertPackagedMarkdownRelativeLinks()

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

required('release publish script syntax', 'node', ['--check', 'scripts/release-publish.js'])
required('npm test', 'npm', ['test'])
required('git diff --check', 'git', ['diff', '--check'])
required('release smoke', 'npm', ['run', 'release:smoke'])
required('npm pack --dry-run', 'npm', ['pack', '--dry-run'])
required('npm publish --dry-run', 'npm', ['publish', '--dry-run'])

console.log(`✅ release verification passed for ${pkg.name}@${pkg.version}`)
if (!npmUser.ok) {
  console.log(`⚠ npm publish is still blocked by npm auth: ${npmAuthFailure}. Rerun this command before publishing.`)
}
