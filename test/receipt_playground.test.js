import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const playgroundPath = path.join(repoRoot, 'docs', 'receipt-playground.html')

test('receipt playground script parses and includes archived chat recovery, handoff freshness, and context diet samples', () => {
  const html = fs.readFileSync(playgroundPath, 'utf8')
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1]

  assert.ok(script, 'expected inline playground script')
  assert.doesNotThrow(() => new Function(script))
  assert.match(html, /pluribus\.archived_agent_chat_recovery_card\.v1/)
  assert.match(html, /validateChatRecovery/)
  assert.match(html, /pluribus\.handoff_freshness_receipt\.v1/)
  assert.match(html, /validateHandoffFreshness/)
  assert.match(html, /pluribus\.context_diet_receipt\.v1/)
  assert.match(html, /validateContextDiet/)
})
