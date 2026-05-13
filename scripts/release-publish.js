#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const forwardedArgs = process.argv.slice(2)
const isDryRun = forwardedArgs.includes('--dry-run')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

function rejectSecretLikeArgs(args) {
  const secretLike = args.find((arg) => /(?:_authToken|token=|password=)/i.test(arg))
  if (secretLike) {
    console.error('Refusing to publish with credential-like data in CLI arguments. Use npm login/2FA or a temporary npm token from the npm config/session instead.')
    process.exit(1)
  }
}

function rejectNonLatestDistTag(args) {
  const tagArg = args.find((arg, index) => arg === '--tag' || arg.startsWith('--tag=') || args[index - 1] === '--tag')
  if (!tagArg) return

  const tagValue = tagArg === '--tag' ? args[args.indexOf(tagArg) + 1] : tagArg.startsWith('--tag=') ? tagArg.slice('--tag='.length) : tagArg
  if (tagValue !== 'latest') {
    console.error('Refusing to publish with a non-latest dist-tag. release:publish is the public distribution path and must update npm latest before running published:smoke.')
    process.exit(1)
  }
}

function run(label, command, args) {
  console.log(`▶ ${label}`)
  execFileSync(command, args, {
    stdio: 'inherit',
  })
}

function capture(label, command, args) {
  console.log(`▶ ${label}`)
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim()
}

function captureQuiet(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function assertReleaseTagMatchesHead() {
  const tagName = `v${pkg.version}`
  const headSha = captureQuiet('git', ['rev-parse', 'HEAD'])
  const tagSha = captureQuiet('git', ['rev-parse', tagName])

  if (!tagSha) {
    console.error(`Refusing to publish ${pkg.name}@${pkg.version}: Git tag ${tagName} does not exist locally. Create/fetch the release tag before publishing so npm latest maps to an immutable source artifact.`)
    process.exit(1)
  }

  if (headSha !== tagSha) {
    console.error(
      `Refusing to publish ${pkg.name}@${pkg.version}: HEAD (${headSha.slice(0, 7)}) does not match ${tagName} (${tagSha.slice(0, 7)}).\n` +
        'Do not publish a package version from a different commit than its GitHub release tag. Reconcile the release first: publish from the tagged commit, create a new version/tag, or explicitly update the GitHub release/tag before retrying.',
    )
    process.exit(1)
  }
}

function assertPublishedLatestMatchesPackage() {
  const npmLatest = capture('verify npm latest dist-tag', 'npm', ['view', pkg.name, 'version'])
  if (npmLatest !== pkg.version) {
    console.error(`${pkg.name}@${pkg.version} was published, but npm latest still resolves to ${npmLatest}. Refusing to treat the release as complete; update the latest dist-tag and rerun published:smoke.`)
    process.exit(1)
  }
}

rejectSecretLikeArgs(forwardedArgs)
rejectNonLatestDistTag(forwardedArgs)

run('release verification', 'npm', ['run', 'release:verify'])

if (isDryRun) {
  console.log('✅ dry-run release publish gate passed. release:verify already ran npm publish --dry-run; no package was published.')
  process.exit(0)
}

assertReleaseTagMatchesHead()
run('npm publish', 'npm', ['publish', '--access', 'public', ...forwardedArgs])
assertPublishedLatestMatchesPackage()
run('published npm smoke', 'npm', ['run', 'published:smoke'])

console.log('✅ npm publish completed and published:smoke passed')
