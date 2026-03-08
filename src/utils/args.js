/**
 * Minimal args parser — no external dependencies.
 * Parses --flag and --flag=value and --flag value pairs.
 */

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
export function parseArgs(argv) {
  const result = {}
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=')
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx)
        const value = arg.slice(eqIdx + 1)
        result[key] = value
      } else {
        const key = arg.slice(2)
        const next = argv[i + 1]
        if (next && !next.startsWith('--')) {
          result[key] = next
          i++
        } else {
          result[key] = true
        }
      }
    }
    i++
  }
  return result
}
