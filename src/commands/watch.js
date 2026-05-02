/**
 * pluribus watch — monitor pluribus.md and re-run sync after edits.
 *
 * This intentionally uses Node's built-in fs.watch instead of an external
 * dependency. The watcher is narrow by design: it watches the selected source
 * file and debounces rapid editor save events before delegating to sync.
 */

import * as fs from 'fs'
import * as path from 'path'
import { runSync } from './sync.js'

const DEFAULT_DEBOUNCE_MS = 400

/**
 * @param {Record<string, string | boolean>} args
 */
export async function runWatch(args) {
  const sourceArg = typeof args.source === 'string' ? args.source : null
  const debounceArg = typeof args.debounce === 'string' ? Number(args.debounce) : null
  const debounceMs = Number.isFinite(debounceArg) && debounceArg >= 300
    ? debounceArg
    : DEFAULT_DEBOUNCE_MS
  const once = Boolean(args.once)
  const cwd = process.cwd()
  const sourcePath = sourceArg
    ? path.resolve(cwd, sourceArg)
    : path.join(cwd, 'pluribus.md')
  const sourceDir = path.dirname(sourcePath)
  const sourceFile = path.basename(sourcePath)
  const displayPath = path.relative(cwd, sourcePath) || sourceFile

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ pluribus.md not found at: ${sourcePath}`)
    console.error('   Run `pluribus init` to create one.')
    process.exit(1)
  }

  let debounceTimer = null
  let running = false
  let pending = false
  let stopped = false

  const syncArgs = { ...args }
  delete syncArgs.once
  delete syncArgs.debounce

  const watcher = fs.watch(sourceDir, { persistent: true }, (_eventType, filename) => {
    if (stopped) return
    if (filename && filename.toString() !== sourceFile) return
    scheduleSync()
  })

  console.log(`👀 Watching ${displayPath} for changes...`)
  console.log(`   Debounce: ${debounceMs}ms${once ? ' | once mode enabled' : ''}`)
  console.log('   Press Ctrl+C to stop.')
  console.log('')

  watcher.on('error', (err) => {
    console.error(`❌ Watcher failed: ${err.message}`)
    process.exit(1)
  })

  process.once('SIGINT', () => {
    stopped = true
    if (debounceTimer) clearTimeout(debounceTimer)
    watcher.close()
    console.log('\n👋 Stopped watching.')
    process.exit(0)
  })

  function scheduleSync() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void runDebouncedSync()
    }, debounceMs)
  }

  async function runDebouncedSync() {
    if (running) {
      pending = true
      return
    }

    running = true
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false })
    console.log(`[${timestamp}] Change detected, syncing...`)

    try {
      await runSync(syncArgs)
      const doneAt = new Date().toLocaleTimeString('en-GB', { hour12: false })
      console.log(`[${doneAt}] Done.`)
    } catch (err) {
      console.error(`❌ Sync failed: ${err.message || err}`)
    } finally {
      running = false
    }

    if (once) {
      stopped = true
      watcher.close()
      process.exit(0)
    }

    if (pending) {
      pending = false
      scheduleSync()
    }
  }
}
