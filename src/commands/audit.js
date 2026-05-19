/**
 * pluribus audit — inspect AI context files and report sync drift.
 *
 * The command is intentionally read-only. With a pluribus.md source present it
 * renders the expected tool files and compares them with what is on disk. When
 * pluribus.md is not present, it scans for known context files to help users
 * decide whether they need a migration pass before adopting Pluribus.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parsePluribusFile, validateSections, REQUIRED_SECTIONS } from '../utils/parser.js'
import { resolveImportsAsync } from '../utils/imports.js'
import { renderTemplate, parseSkillFile } from '../utils/renderer.js'
import { BUILT_IN_SKILLS, SUPPORTED_TOOLS } from '../skills/built-in.js'

const TOOLS_COMMENT_RE = /<!--\s*pluribus:tools:\s*([^-]+)\s*-->/
const AUDIT_FEEDBACK_URL = 'https://github.com/caioribeiroclw-pixel/pluribus/issues/new?template=audit-feedback.yml'

const KNOWN_CONTEXT_FILES = [
  ...new Set([
    ...Object.values(BUILT_IN_SKILLS).flatMap((skill) => skill.outputFiles),
    '.cursor/rules',
    '.github/instructions',
    'AGENTS.md',
    'CLAUDE.md',
  ]),
]

/**
 * @param {Record<string, string | boolean>} args
 */
export async function runAudit(args) {
  const sourceArg = typeof args.source === 'string' ? args.source : null
  const toolsArg = typeof args.tools === 'string' ? args.tools : null
  const updateImports = Boolean(args['update-imports'])
  const ci = Boolean(args.ci)
  const strict = Boolean(args.strict || ci)
  const json = Boolean(args.json)
  const githubAnnotations = Boolean(args['github-annotations'] || ci)
  const fidelityReportEnabled = Boolean(args['fidelity-report'])
  const hasJsonOutput = Object.prototype.hasOwnProperty.call(args, 'output')
  const jsonOutput = typeof args.output === 'string' && args.output.trim() ? args.output : null
  const cwd = process.cwd()

  if (hasJsonOutput && !json) {
    console.error('❌ --output requires --json.')
    process.exit(1)
  }

  if (hasJsonOutput && !jsonOutput) {
    console.error('❌ --output requires a file path.')
    process.exit(1)
  }
  const sourcePath = sourceArg
    ? path.resolve(cwd, sourceArg)
    : path.join(cwd, 'pluribus.md')
  const displaySource = path.relative(cwd, sourcePath) || 'pluribus.md'

  if (!fs.existsSync(sourcePath)) {
    const found = scanKnownContextFiles(cwd)

    if (json) {
      writeJson({
        ok: !strict,
        source: displaySource,
        sourceFound: false,
        existingContextFiles: found,
        summary: { existingContextFiles: found.length },
        nextStep: found.length > 0
          ? 'Use these files as migration inputs for pluribus init, then run pluribus audit again.'
          : 'Run pluribus init to create a source file, then pluribus sync --dry-run.',
        docs: 'https://github.com/caioribeiroclw-pixel/pluribus/blob/main/docs/migrate-existing-context.md',
        feedback: AUDIT_FEEDBACK_URL,
      }, jsonOutput)
    } else {
      console.log(`ℹ️  No ${displaySource} found.`)

      if (found.length > 0) {
        console.log('')
        console.log('Found existing AI context surface(s):')
        for (const file of found) {
          console.log(`   • ${file}`)
        }
        console.log('')
        console.log('Use these as migration inputs for `pluribus init`, then run `pluribus audit` again.')
      } else {
        console.log('')
        console.log('No known AI context files found in this directory.')
        console.log('Run `pluribus init` to create a source file, then `pluribus sync --dry-run`.')
      }

      console.log('Docs: https://github.com/caioribeiroclw-pixel/pluribus/blob/main/docs/migrate-existing-context.md')
      console.log(`Feedback: ${AUDIT_FEEDBACK_URL}`)
    }

    if (strict) process.exit(1)
    return
  }

  let rawContent
  try {
    rawContent = fs.readFileSync(sourcePath, 'utf8')
  } catch (err) {
    console.error(`❌ Could not read ${sourcePath}: ${err.message}`)
    process.exit(1)
  }

  const errors = []
  let resolvedContent
  try {
    const projectDir = path.dirname(sourcePath)
    const resolved = await resolveImportsAsync(sourcePath, {
      rootDir: projectDir,
      allowRemote: updateImports,
      lockfilePath: path.join(projectDir, 'pluribus.lock.json'),
      cacheDir: path.join(projectDir, '.pluribus', 'cache', 'remote'),
      updateLockfile: updateImports,
    })
    resolvedContent = resolved.content
  } catch (err) {
    errors.push(`Could not resolve imports: ${err.message}`)
  }

  const sections = resolvedContent ? parsePluribusFile(resolvedContent) : {}
  const validation = validateSections(sections)
  for (const error of validation.errors) {
    errors.push(error)
  }

  const tools = getTools(rawContent, toolsArg)
  const unknownTools = tools.filter((tool) => !SUPPORTED_TOOLS.includes(tool))
  if (unknownTools.length > 0) {
    errors.push(`Unknown tool(s): ${unknownTools.join(', ')}. Supported: ${SUPPORTED_TOOLS.join(', ')}`)
  }

  if (errors.length > 0) {
    if (json) {
      writeJson({
        ok: false,
        source: displaySource,
        sourceFound: true,
        errors,
        requiredSections: REQUIRED_SECTIONS,
      }, jsonOutput)
    } else {
      console.error(`❌ Cannot audit ${displaySource}:`)
      for (const error of errors) {
        console.error(`   • ${error}`)
      }
      console.error(`\n   Complete required sections (${REQUIRED_SECTIONS.join(', ')}) and re-run.`)
    }
    process.exit(1)
  }

  if (!json) {
    console.log(`🔎 Auditing ${displaySource} → ${tools.join(', ')}`)
    console.log('')
  }

  const results = []
  for (const toolId of tools) {
    const skill = loadSkill(cwd, toolId)
    if (!skill) {
      results.push({ toolId, status: 'error', file: '(skill)', message: 'Skill not found' })
      continue
    }

    const missingRequired = skill.required.filter((required) => {
      const sectionName = Object.keys(sections).find((name) => name.toLowerCase() === required.toLowerCase())
      return !sectionName || !sections[sectionName]?.trim()
    })

    if (missingRequired.length > 0) {
      results.push({
        toolId,
        status: 'error',
        file: '(sections)',
        message: `Missing required section(s) for ${toolId}: ${missingRequired.join(', ')}`,
      })
      continue
    }

    let rendered
    try {
      rendered = renderTemplate(skill.template, sections, path.relative(cwd, sourcePath) || 'pluribus.md')
    } catch (err) {
      results.push({ toolId, status: 'error', file: '(template)', message: err.message })
      continue
    }

    for (const outputFile of skill.outputFiles) {
      const outputPath = path.join(cwd, outputFile)
      if (!fs.existsSync(outputPath)) {
        results.push({ toolId, status: 'missing', file: outputFile })
        continue
      }

      const existing = fs.readFileSync(outputPath, 'utf8')
      if (normalizeGeneratedMetadata(existing) === normalizeGeneratedMetadata(rendered)) {
        results.push({ toolId, status: 'current', file: outputFile })
      } else {
        results.push({ toolId, status: 'drift', file: outputFile })
      }
    }
  }

  if (!json) {
    for (const result of results) {
      const label = `[${result.toolId}] ${result.file}`
      if (result.status === 'current') {
        console.log(`   ✅ ${label} is current`)
      } else if (result.status === 'missing') {
        console.log(`   ⚠️  ${label} is missing`)
      } else if (result.status === 'drift') {
        console.log(`   ⚠️  ${label} differs from generated output`)
      } else {
        console.log(`   ❌ ${label}: ${result.message}`)
      }
    }
  }

  const summary = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1
    return acc
  }, {})

  const hasProblem = (summary.drift || 0) + (summary.missing || 0) + (summary.error || 0) > 0
  const fidelityReport = fidelityReportEnabled ? buildFidelityReport({ cwd, sections, tools, loadSkill }) : null

  if (!json && fidelityReport) {
    printFidelityReport(fidelityReport)
  }

  if (githubAnnotations) {
    writeGitHubAnnotations(results, { strict })
  }

  if (json) {
    const payload = {
      ok: !hasProblem,
      source: displaySource,
      sourceFound: true,
      tools,
      results,
      summary: {
        current: summary.current || 0,
        drifted: summary.drift || 0,
        missing: summary.missing || 0,
        errors: summary.error || 0,
      },
      nextStep: hasProblem
        ? 'Run pluribus sync --dry-run to preview fixes, then pluribus sync to update generated files.'
        : 'Generated context files are in sync.',
      feedback: AUDIT_FEEDBACK_URL,
    }

    if (fidelityReport) {
      payload.fidelityReport = fidelityReport
    }

    writeJson(payload, jsonOutput)
  } else {
    console.log('')
    console.log(`Summary: ${summary.current || 0} current, ${summary.drift || 0} drifted, ${summary.missing || 0} missing, ${summary.error || 0} error(s).`)

    if (hasProblem) {
      console.log('Run `pluribus sync --dry-run` to preview fixes, then `pluribus sync` to update generated files.')
      console.log(`Feedback: ${AUDIT_FEEDBACK_URL}`)
    } else {
      console.log('✅ Generated context files are in sync.')
    }
  }

  if ((strict && hasProblem) || (summary.error || 0) > 0) {
    process.exit(1)
  }
}

function buildFidelityReport({ cwd, sections, tools, loadSkill }) {
  const presentSections = Object.entries(sections)
    .filter(([, value]) => String(value || '').trim())
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b))

  const lowerPresentSections = new Set(presentSections.map((name) => name.toLowerCase()))
  const targets = tools.map((toolId) => {
    const skill = loadSkill(cwd, toolId)
    const representedSections = new Set([...(skill?.required || []), ...(skill?.optional || [])].map((name) => name.toLowerCase()))
    const unsupportedSections = presentSections.filter((name) => !representedSections.has(name.toLowerCase()))

    const outputFiles = skill?.outputFiles || []
    const activation = inferActivation(toolId, outputFiles)
    const discovery = inferDiscovery(toolId, outputFiles)
    const represented = presentSections.filter((name) => representedSections.has(name.toLowerCase()))

    const loadEvidence = inferLoadEvidence(toolId, outputFiles, discovery, activation)
    const effectiveContext = inferEffectiveContext(toolId, outputFiles, loadEvidence)

    return {
      toolId,
      files: outputFiles,
      nativeDiscoverySurface: discovery.nativeDiscoverySurface,
      resolutionAnchor: discovery.resolutionAnchor,
      genericFallback: discovery.genericFallback,
      manualActivationRequired: discovery.manualActivationRequired,
      activation,
      loadEvidence,
      effectiveContext,
      semanticDifference: summarizeSemanticDifference({ unsupportedSections, activation, discovery, effectiveContext, loadEvidence }),
      representedSections: represented,
      unsupportedSections,
    }
  })

  const warnings = []
  for (const target of targets) {
    if (target.unsupportedSections.length > 0) {
      warnings.push({
        code: 'section-not-rendered-by-target',
        target: target.toolId,
        message: `${target.toolId} template does not render section(s): ${target.unsupportedSections.join(', ')}`,
      })
    }
  }

  if (targets.some((target) => target.activation.kind === 'flat-project-wide')) {
    warnings.push({
      code: 'project-wide-activation-only',
      target: '*',
      message: 'Generated outputs are project-wide/always-on; Pluribus does not currently model path-scoped activation, manual attach, or progressive disclosure semantics.',
    })
  }

  if (targets.some((target) => target.effectiveContext?.scope === 'repo-root')) {
    warnings.push({
      code: 'effective-context-is-repo-root',
      target: '*',
      message: 'Effective context evidence is repo-root only; Pluribus does not currently prove root→subpath inheritance, overrides, or path isolation for monorepos.',
    })
  }

  if (targets.some((target) => target.loadEvidence?.dedupeRisk === 'unknown')) {
    warnings.push({
      code: 'load-dedupe-not-proven',
      target: '*',
      message: 'Load evidence records the expected delivery path, but Pluribus does not currently prove runtime deduplication across native files, hooks, generated imports, or manual injection.',
    })
  }

  const advancedSections = ['workflow', 'context', 'examples', 'anti-patterns'].filter((name) => lowerPresentSections.has(name))
  if (advancedSections.length > 0 && warnings.some((warning) => warning.code === 'section-not-rendered-by-target')) {
    warnings.push({
      code: 'portability-claim-needs-evidence',
      target: '*',
      message: `Do not claim universal portability without evidence: advanced section(s) ${advancedSections.join(', ')} are not represented equally by every selected target.`,
    })
  }

  return {
    claim: 'project-wide instruction portability evidence for selected targets',
    sourceSections: presentSections,
    targets,
    summary: {
      targetCount: targets.length,
      targetsWithUnsupportedSections: targets.filter((target) => target.unsupportedSections.length > 0).length,
      warningCount: warnings.length,
    },
    warnings,
    nextStep: warnings.length > 0
      ? 'Review unsupportedSections/warnings before calling this context universal; narrow the tools list, change the source, or document known lossy targets.'
      : 'Selected targets render the current non-empty source sections with no known Pluribus template loss; still smoke-test behavior in each agent.',
  }
}

function inferActivation(toolId, outputFiles) {
  if (toolId === 'windsurf' || toolId === 'continue') {
    return {
      kind: 'project-wide-rule',
      evidence: outputFiles,
    }
  }

  return {
    kind: 'flat-project-wide',
    evidence: outputFiles,
  }
}

function inferDiscovery(toolId, outputFiles) {
  const primaryFile = outputFiles[0] || null
  const nativeDiscoverySurfaces = {
    claude: 'CLAUDE.md',
    cursor: '.cursorrules',
    openclaw: 'AGENTS.md',
    copilot: '.github/copilot-instructions.md',
    windsurf: '.windsurf/rules/*.md',
    continue: '.continue/rules/*.md',
    zed: '.rules',
    bob: '.bob/rules/*.md',
  }

  return {
    nativeDiscoverySurface: nativeDiscoverySurfaces[toolId] || primaryFile,
    resolutionAnchor: primaryFile ? 'repo-root' : 'unknown',
    genericFallback: toolId === 'openclaw',
    manualActivationRequired: false,
  }
}

function inferLoadEvidence(toolId, outputFiles, discovery, activation) {
  const primaryFile = outputFiles[0] || null
  const loadedBy = discovery.genericFallback ? 'generic-agent-file' : 'native-file-discovery'

  return {
    loadedBy,
    effectiveSource: primaryFile,
    deliveryPath: primaryFile,
    deliveryMechanism: discovery.genericFallback ? 'generated-generic-fallback' : 'generated-native-surface',
    hookInstalled: false,
    injectedOnSessionStart: false,
    manualInjectionRequired: discovery.manualActivationRequired,
    resumeBehavior: 'not-proven',
    dedupeKey: primaryFile ? `${toolId}:${loadedBy}:${primaryFile}` : `${toolId}:${loadedBy}:unknown`,
    dedupeRisk: 'unknown',
    evidence: outputFiles,
    note: `${toolId} load path is inferred from generated files and known discovery surfaces; verify runtime loading/deduplication in the target agent when hooks, imports, or manual injection are also used.`,
  }
}

function inferEffectiveContext(toolId, outputFiles, loadEvidence) {
  return {
    scope: 'repo-root',
    pathScoped: false,
    inheritance: 'none-modeled',
    overrideBehavior: 'none-modeled',
    isolationEvidence: 'not-modeled',
    entrypoints: outputFiles,
    loadedBy: loadEvidence.loadedBy,
    effectiveSource: loadEvidence.effectiveSource,
    note: `${toolId} output is audited as repo-root context only; verify subdirectory load order separately in monorepos.`,
  }
}

function summarizeSemanticDifference({ unsupportedSections, activation, discovery, effectiveContext, loadEvidence }) {
  const differences = []

  if (unsupportedSections.length > 0) {
    differences.push('section-loss')
  }

  if (activation.kind === 'flat-project-wide') {
    differences.push('project-wide-only')
  }

  if (effectiveContext?.pathScoped === false) {
    differences.push('no-path-scope-evidence')
  }

  if (discovery.genericFallback) {
    differences.push('generic-agent-file')
  }

  if (discovery.manualActivationRequired) {
    differences.push('manual-activation-required')
  }

  if (loadEvidence?.dedupeRisk === 'unknown') {
    differences.push('runtime-load-dedupe-not-proven')
  }

  return differences.length > 0 ? differences : ['no-known-template-loss']
}

function printFidelityReport(report) {
  console.log('')
  console.log('Fidelity report:')
  console.log(`   Claim: ${report.claim}`)
  console.log(`   Targets: ${report.targets.map((target) => target.toolId).join(', ')}`)

  for (const target of report.targets) {
    const unsupported = target.unsupportedSections.length > 0
      ? `; unsupported sections: ${target.unsupportedSections.join(', ')}`
      : '; no known section loss'
    const discovery = target.nativeDiscoverySurface
      ? `; surface: ${target.nativeDiscoverySurface}`
      : ''
    const scope = target.effectiveContext?.scope
      ? `; effective context: ${target.effectiveContext.scope}`
      : ''
    const loadedBy = target.loadEvidence?.loadedBy
      ? `; loaded by: ${target.loadEvidence.loadedBy}`
      : ''
    const semantics = target.semanticDifference?.length
      ? `; semantic: ${target.semanticDifference.join(', ')}`
      : ''
    console.log(`   • ${target.toolId}: ${target.activation.kind}${discovery}${scope}${loadedBy}${unsupported}${semantics}`)
  }

  for (const warning of report.warnings) {
    console.log(`   ⚠️  ${warning.code}: ${warning.message}`)
  }

  console.log(`   Next: ${report.nextStep}`)
}

function getTools(rawContent, toolsArg) {
  if (toolsArg) {
    return splitTools(toolsArg)
  }

  const match = rawContent.match(TOOLS_COMMENT_RE)
  if (match) {
    return splitTools(match[1])
  }

  return [...SUPPORTED_TOOLS]
}

function splitTools(value) {
  return String(value)
    .split(',')
    .map((tool) => tool.trim().toLowerCase())
    .filter(Boolean)
}

function loadSkill(cwd, toolId) {
  const localSkillPath = path.join(cwd, 'pluribus', 'skills', `${toolId}.md`)
  if (fs.existsSync(localSkillPath)) {
    const parsed = parseSkillFile(fs.readFileSync(localSkillPath, 'utf8'))
    return {
      id: toolId,
      outputFiles: parsed.output,
      template: parsed.template,
      required: parsed.sections.required,
      optional: parsed.sections.optional,
    }
  }

  return BUILT_IN_SKILLS[toolId]
}

function scanKnownContextFiles(cwd) {
  return KNOWN_CONTEXT_FILES
    .filter((relativePath) => fs.existsSync(path.join(cwd, relativePath)))
    .sort()
}

function normalizeGeneratedMetadata(content) {
  return content
    .replace(/Generated by Pluribus ([^\s]+) on \d{4}-\d{2}-\d{2}/g, 'Generated by Pluribus $1 on <date>')
    .replace(/generated by Pluribus ([^\s]+) on \d{4}-\d{2}-\d{2}/g, 'generated by Pluribus $1 on <date>')
}

function writeGitHubAnnotations(results, { strict = false } = {}) {
  for (const result of results) {
    if (result.status === 'current') continue

    const level = result.status === 'error' || strict ? 'error' : 'warning'
    const title = `Pluribus audit: ${result.status}`
    const message = annotationMessage(result)
    const file = result.file && !result.file.startsWith('(') ? ` file=${escapeAnnotationProperty(result.file)},` : ''
    console.error(`::${level}${file}title=${escapeAnnotationProperty(title)}::${escapeAnnotationMessage(message)}`)
  }
}

function annotationMessage(result) {
  if (result.status === 'missing') {
    return `${result.file} is missing for ${result.toolId}. Run pluribus sync --dry-run to preview the generated output.`
  }

  if (result.status === 'drift') {
    return `${result.file} differs from generated ${result.toolId} output. Run pluribus sync --dry-run to preview the fix.`
  }

  return result.message || `${result.toolId} audit failed for ${result.file}`
}

function escapeAnnotationProperty(value) {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/,/g, '%2C')
    .replace(/:/g, '%3A')
}

function escapeAnnotationMessage(value) {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}

function writeJson(value, outputPath = null) {
  const payload = `${JSON.stringify(value, null, 2)}\n`
  if (outputPath) {
    const resolvedPath = path.resolve(process.cwd(), outputPath)
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
    fs.writeFileSync(resolvedPath, payload, 'utf8')
    return
  }

  process.stdout.write(payload)
}
