#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const forwardedArgs = process.argv.slice(2)
const isDryRun = forwardedArgs.includes('--dry-run')

function rejectSecretLikeArgs(args) {
  const secretLike = args.find((arg) => /(?:_authToken|token=|password=)/i.test(arg))
  if (secretLike) {
    console.error('Refusing to publish with credential-like data in CLI arguments. Use npm login/2FA or a temporary npm token from the npm config/session instead.')
    process.exit(1)
  }
}

function run(label, command, args) {
  console.log(`▶ ${label}`)
  execFileSync(command, args, {
    stdio: 'inherit',
  })
}

rejectSecretLikeArgs(forwardedArgs)

run('release verification', 'npm', ['run', 'release:verify'])

if (isDryRun) {
  console.log('✅ dry-run release publish gate passed. release:verify already ran npm publish --dry-run; no package was published.')
  process.exit(0)
}

run('npm publish', 'npm', ['publish', '--access', 'public', ...forwardedArgs])
run('published npm smoke', 'npm', ['run', 'published:smoke'])

console.log('✅ npm publish completed and published:smoke passed')
