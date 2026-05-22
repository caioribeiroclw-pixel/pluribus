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
  'AI agent context fidelity audit',
  'semantic drift agent context',
]

const githubQueries = [
  pkg.name,
  'AI context sync Claude Cursor',
  'claude code context sync pluribus-context',
  'AI agent context fidelity audit',
]

const trackedExternalDistributions = [
  {
    name: 'awesome-ai-coding-tools',
    repo: 'ai-for-developers/awesome-ai-coding-tools',
    pullRequest: 326,
    url: 'https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/326',
    reason: 'contextual awesome-list submission for AI coding CLI discovery',
  },
  {
    name: 'awesome-claude-code',
    repo: 'jqueryscript/awesome-claude-code',
    pullRequest: 286,
    url: 'https://github.com/jqueryscript/awesome-claude-code/pull/286',
    reason: 'contextual Claude Code tools directory submission for CLAUDE.md/context sync discovery',
  },
  {
    name: 'memory-graph',
    repo: 'memory-graph/memory-graph',
    pullRequest: 10,
    url: 'https://github.com/memory-graph/memory-graph/pull/10',
    reason: 'adjacent MCP memory docs contribution about multi-client memory protocol drift',
  },
  {
    name: 'awesome-ai-memory-systems',
    repo: 'brandonhimpfen/awesome-ai-memory-systems',
    pullRequest: 9,
    url: 'https://github.com/brandonhimpfen/awesome-ai-memory-systems/pull/9',
    reason: 'contextual directory submission for context portability/load-evidence receipts among AI memory systems',
  },
  {
    name: 'awesome-codex-cli',
    repo: 'RoggeOhta/awesome-codex-cli',
    pullRequest: 46,
    url: 'https://github.com/RoggeOhta/awesome-codex-cli/pull/46',
    reason: 'contextual Codex CLI directory submission for AGENTS.md context receipts and cross-agent audit',
  },
  {
    name: 'agents.md',
    repo: 'agentsmd/agents.md',
    pullRequest: 190,
    url: 'https://github.com/agentsmd/agents.md/pull/190',
    reason: 'upstream AGENTS.md guidance for context budget/diet and focused instructions',
  },
  {
    name: 'agents-md-agent-overlays',
    repo: 'agentsmd/agents.md',
    issueNumber: 185,
    url: 'https://github.com/agentsmd/agents.md/issues/185',
    reason: 'upstream AGENTS.md discussion about agent-specific overlays and evidence for base/overlay composition',
  },
  {
    name: 'semble',
    repo: 'MinishLab/semble',
    issueNumber: 123,
    url: 'https://github.com/MinishLab/semble/issues/123',
    reason: 'contextual code-search/agent-eval feedback about per-task search receipts',
  },
  {
    name: 'semantic-conventions-genai',
    repo: 'open-telemetry/semantic-conventions-genai',
    issueNumber: 181,
    url: 'https://github.com/open-telemetry/semantic-conventions-genai/issues/181',
    reason: 'upstream OpenTelemetry GenAI proposal for privacy-first context input evidence in agent traces',
  },
  {
    name: 'claude-telemetry-issue',
    repo: 'TechNickAI/claude_telemetry',
    issueNumber: 8,
    url: 'https://github.com/TechNickAI/claude_telemetry/issues/8',
    reason: 'contextual Claude Code OTel wrapper feedback about privacy-preserving context input events',
  },
  {
    name: 'claude-telemetry-pr',
    repo: 'TechNickAI/claude_telemetry',
    pullRequest: 9,
    url: 'https://github.com/TechNickAI/claude_telemetry/pull/9',
    reason: 'external implementation PR for opt-in context.input.loaded events in a Claude Code telemetry wrapper',
  },
  {
    name: 'claude-context-search-receipts',
    repo: 'zilliztech/claude-context',
    issueNumber: 382,
    url: 'https://github.com/zilliztech/claude-context/issues/382',
    reason: 'contextual MCP code-search feedback about privacy-preserving search/result receipts',
  },
  {
    name: 'awesome-ai-coding-agent-tools',
    repo: 'namphuongtran/awesome-ai-coding-agent-tools',
    pullRequest: 14,
    url: 'https://github.com/namphuongtran/awesome-ai-coding-agent-tools/pull/14',
    reason: 'contextual directory submission under observability for context receipts and fidelity audit tooling',
  },
  {
    name: 'claude-tap-context-receipts',
    repo: 'liaohch3/claude-tap',
    issueNumber: 203,
    url: 'https://github.com/liaohch3/claude-tap/issues/203',
    reason: 'contextual local trace viewer feedback about privacy-safe context receipt exports',
  },
  {
    name: 'claude-code-cowork-skill-tracking',
    repo: 'anthropics/claude-code',
    issueNumber: 41845,
    url: 'https://github.com/anthropics/claude-code/issues/41845',
    reason: 'contextual Claude/Cowork OTel feedback about privacy-first skill invocation receipts',
  },
  {
    name: 'supermemory-retrieval-receipts',
    repo: 'supermemoryai/supermemory',
    issueNumber: 985,
    url: 'https://github.com/supermemoryai/supermemory/issues/985',
    reason: 'contextual shared-memory/MCP feedback about privacy-safe memory retrieval receipts',
  },
  {
    name: 'memorix-memory-handoff-receipts',
    repo: 'AVIDS2/memorix',
    issueNumber: 95,
    url: 'https://github.com/AVIDS2/memorix/issues/95',
    reason: 'contextual cross-agent MCP memory feedback about privacy-safe handoff/write/search receipts',
  },
  {
    name: 'gbrain-doctor-remediation-receipts',
    repo: 'garrytan/gbrain',
    issueNumber: 1273,
    url: 'https://github.com/garrytan/gbrain/issues/1273',
    reason: 'contextual self-remediating memory/knowledge-graph feedback about privacy-safe doctor/remediation receipts',
  },
  {
    name: 'claude-code-context-compaction-auditability',
    repo: 'anthropics/claude-code',
    issueNumber: 50513,
    url: 'https://github.com/anthropics/claude-code/issues/50513',
    reason: 'contextual Claude Code reliability/auditability feedback about privacy-safe context compaction receipts and objective continuity',
  },
  {
    name: 'claude-plugins-mcp-tool-search-receipts',
    repo: 'aiocean/claude-plugins',
    issueNumber: 14,
    url: 'https://github.com/aiocean/claude-plugins/issues/14',
    reason: 'contextual Claude Code plugin ecosystem feedback about deferred MCP Tool Search receipts and context-budget evidence',
  },
  {
    name: 'mcp-memory-service-incremental-consolidation-receipts',
    repo: 'doobidoo/mcp-memory-service',
    issueNumber: 983,
    url: 'https://github.com/doobidoo/mcp-memory-service/issues/983',
    reason: 'contextual MCP memory-service feedback about hook-safe incremental consolidation receipts and lineage evidence',
  },
  {
    name: 'agentmemory-governance-delete-receipts',
    repo: 'rohitg00/agentmemory',
    issueNumber: 595,
    url: 'https://github.com/rohitg00/agentmemory/issues/595',
    reason: 'contextual persistent memory feedback about privacy-safe governance/delete receipts for forget skills and audit logs',
  },
  {
    name: 'github-mcp-secret-scanning-receipts',
    repo: 'github/github-mcp-server',
    issueNumber: 1921,
    url: 'https://github.com/github/github-mcp-server/issues/1921',
    reason: 'contextual GitHub MCP security feedback about privacy-safe secret scanning receipts for session-only findings and bypass policy evidence',
  },
  {
    name: 'agent-skills-router-benchmark-receipts',
    repo: 'muratcankoylan/Agent-Skills-for-Context-Engineering',
    pullRequest: 87,
    url: 'https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/pull/87',
    reason: 'contextual Agent Skills feedback about privacy-safe skill routing benchmark receipts and lazy skill body loading evidence',
  },
  {
    name: 'awesome-context-engineering-context-receipts',
    repo: 'Meirtz/Awesome-Context-Engineering',
    pullRequest: 62,
    url: 'https://github.com/Meirtz/Awesome-Context-Engineering/pull/62',
    reason: 'contextual context-engineering directory submission under agent observability for privacy-safe context receipts',
  },
  {
    name: 'opencode-mcp-tool-search-receipts',
    repo: 'anomalyco/opencode',
    issueNumber: 8625,
    url: 'https://github.com/anomalyco/opencode/issues/8625',
    reason: 'contextual opencode MCP lazy/tool-search discussion about context-budget receipts for deferred tool definitions',
  },
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

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': `${pkg.name}-discovery-smoke` },
    })

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` }
    }

    return { ok: true, data: await response.json() }
  } catch (error) {
    return { ok: false, error: error.message }
  }
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

const downloadRanges = ['last-day', 'last-week', 'last-month']
const downloadResults = await Promise.all(
  downloadRanges.map(async (range) => {
    const result = await fetchJson(`https://api.npmjs.org/downloads/point/${range}/${pkg.name}`)
    if (!result.ok) {
      return { range, ok: false, error: result.error }
    }

    return {
      range,
      ok: true,
      downloads: result.data.downloads,
      start: result.data.start,
      end: result.data.end,
    }
  }),
)

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

function githubJson(label, command, args, fallback) {
  const result = tryRun(command, args)
  if (!result.ok) {
    return { ok: false, label, error: result.error || result.stdout }
  }

  return { ok: true, data: parseJson(result.stdout, fallback) }
}

function collectGithubSignals() {
  const repo = githubJson('repo', 'gh', [
    'repo',
    'view',
    'caioribeiroclw-pixel/pluribus',
    '--json',
    'nameWithOwner,description,stargazerCount,forkCount,watchers,latestRelease,updatedAt',
  ], {})

  const issues = githubJson('open issues', 'gh', [
    'issue',
    'list',
    '--repo',
    'caioribeiroclw-pixel/pluribus',
    '--state',
    'open',
    '--limit',
    '20',
    '--json',
    'number,title,updatedAt,comments,author',
  ], [])

  const pullRequests = githubJson('open pull requests', 'gh', [
    'pr',
    'list',
    '--repo',
    'caioribeiroclw-pixel/pluribus',
    '--state',
    'open',
    '--limit',
    '20',
    '--json',
    'number,title,updatedAt,author',
  ], [])

  const discussionsQuery = `
    query {
      repository(owner: "caioribeiroclw-pixel", name: "pluribus") {
        discussions(first: 10, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes {
            number
            title
            updatedAt
            comments(first: 20) {
              totalCount
              nodes {
                author { login }
                updatedAt
              }
            }
          }
        }
      }
    }
  `
  const discussionsResult = githubJson('discussions', 'gh', ['api', 'graphql', '-f', `query=${discussionsQuery}`], {})
  const discussions = discussionsResult.ok ? discussionsResult.data?.data?.repository?.discussions?.nodes || [] : []

  return {
    ok: repo.ok && issues.ok && pullRequests.ok && discussionsResult.ok,
    repo: repo.ok
      ? {
          nameWithOwner: repo.data.nameWithOwner,
          description: repo.data.description,
          stars: repo.data.stargazerCount,
          forks: repo.data.forkCount,
          watchers: repo.data.watchers?.totalCount,
          latestRelease: repo.data.latestRelease?.tagName || null,
          updatedAt: repo.data.updatedAt,
        }
      : repo,
    openIssues: issues.ok
      ? issues.data.map((issue) => ({
          number: issue.number,
          title: issue.title,
          updatedAt: issue.updatedAt,
          comments: Array.isArray(issue.comments) ? issue.comments.length : issue.comments,
          author: issue.author?.login,
        }))
      : issues,
    openPullRequests: pullRequests.ok
      ? pullRequests.data.map((pullRequest) => ({
          number: pullRequest.number,
          title: pullRequest.title,
          updatedAt: pullRequest.updatedAt,
          author: pullRequest.author?.login,
        }))
      : pullRequests,
    discussions: discussionsResult.ok
      ? discussions.map((discussion) => {
          const commentNodes = discussion.comments?.nodes || []
          const recentCommentAuthors = commentNodes.map((comment) => comment.author?.login).filter(Boolean)
          const externalRecentComments = recentCommentAuthors.filter((author) => author !== 'caioribeiroclw-pixel').length

          return {
            number: discussion.number,
            title: discussion.title,
            updatedAt: discussion.updatedAt,
            comments: discussion.comments?.totalCount || 0,
            recentCommentAuthors,
            externalRecentComments,
          }
        })
      : discussionsResult,
  }
}

function collectExternalDistributionSignals() {
  return trackedExternalDistributions.map((distribution) => {
    const isIssue = Boolean(distribution.issueNumber)
    const result = githubJson(`external distribution ${distribution.name}`, 'gh', [
      isIssue ? 'issue' : 'pr',
      'view',
      String(isIssue ? distribution.issueNumber : distribution.pullRequest),
      '--repo',
      distribution.repo,
      '--json',
      isIssue
        ? 'number,title,state,comments,updatedAt,author,url'
        : 'number,title,state,mergeable,isDraft,reviewDecision,comments,updatedAt,author,url',
    ], {})

    if (!result.ok) {
      return {
        ...distribution,
        type: isIssue ? 'issue' : 'pullRequest',
        ok: false,
        error: result.error,
      }
    }

    return {
      ...distribution,
      type: isIssue ? 'issue' : 'pullRequest',
      ok: true,
      title: result.data.title,
      state: result.data.state,
      mergeable: isIssue ? null : result.data.mergeable,
      isDraft: isIssue ? null : result.data.isDraft,
      reviewDecision: isIssue ? null : result.data.reviewDecision || null,
      comments: Array.isArray(result.data.comments) ? result.data.comments.length : result.data.comments,
      updatedAt: result.data.updatedAt,
      author: result.data.author?.login,
      url: result.data.url || distribution.url,
    }
  })
}

const githubSignals = collectGithubSignals()
const externalDistributions = collectExternalDistributionSignals()
const publishedKeywords = new Set(metadata.keywords || [])
const localKeywords = pkg.keywords || []
const publicPackage = {
  name: metadata.name,
  version: metadata.version,
  description: metadata.description,
  keywordCount: metadata.keywords?.length || 0,
}
const localPackage = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  keywordCount: localKeywords.length,
  unpublishedKeywords: localKeywords.filter((keyword) => !publishedKeywords.has(keyword)),
}

const report = {
  // Backwards-compatible alias for the currently published npm package.
  package: publicPackage,
  publicPackage,
  localPackage,
  npmDownloads: downloadResults,
  npmSearch: npmResults,
  githubSearch: githubResults,
  githubSignals,
  externalDistributions,
  interpretation: {
    exactNpmNameVisible: exactNameSearch.rank === 0,
    npmLatestMatchesLocal: metadata.version === pkg.version,
    pendingNpmPublish: metadata.version !== pkg.version,
    localDescriptionPublished: metadata.description === pkg.description,
    unpublishedKeywordCount: localPackage.unpublishedKeywords.length,
    genericNpmQueriesWithPluribus: npmResults.filter((result) => result.query !== pkg.name && result.rank !== null).length,
    githubQueriesWithPluribus: githubResults.filter((result) => result.ok && result.rank !== null).length,
    openIssueCount: Array.isArray(githubSignals.openIssues) ? githubSignals.openIssues.length : null,
    openPullRequestCount: Array.isArray(githubSignals.openPullRequests) ? githubSignals.openPullRequests.length : null,
    externalRecentDiscussionComments: Array.isArray(githubSignals.discussions)
      ? githubSignals.discussions.reduce((total, discussion) => total + discussion.externalRecentComments, 0)
      : null,
    trackedExternalDistributions: externalDistributions.length,
    openExternalDistributionPullRequests: externalDistributions.filter((distribution) => distribution.ok && distribution.type === 'pullRequest' && distribution.state === 'OPEN').length,
    openExternalDistributionIssues: externalDistributions.filter((distribution) => distribution.ok && distribution.type === 'issue' && distribution.state === 'OPEN').length,
    mergedExternalDistributionPullRequests: externalDistributions.filter((distribution) => distribution.ok && distribution.type === 'pullRequest' && distribution.state === 'MERGED').length,
  },
}

console.log(JSON.stringify(report, null, 2))
