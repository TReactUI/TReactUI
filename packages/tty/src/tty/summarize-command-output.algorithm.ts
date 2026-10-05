const MAX_LINES = 6
const MAX_CHARS = 300

const endsSentence = /[!.:;?]$/

/**
 * A sentence for a screen reader to read when a command ends: its first few
 * lines, and how many more there are. Whole output stays available in a region.
 */
export function summarizeCommandOutput (lines: string[]): string {
  const printed = lines.map(line => line.trim()).filter(line => line !== '')
  if (printed.length === 0) return 'No output.'

  const taken: string[] = []
  let chars = 0
  for (const line of printed) {
    if (taken.length >= MAX_LINES || chars + line.length > MAX_CHARS) break
    taken.push(line)
    chars += line.length
  }
  // A single very long line is shortened rather than dropped.
  if (taken.length === 0) taken.push(`${printed[0]?.slice(0, MAX_CHARS) ?? ''}…`)

  const spoken = taken.map(line => endsSentence.test(line) ? line : `${line}.`).join(' ')
  const more = printed.length - taken.length

  return more > 0
    ? `Output: ${spoken} And ${more} more ${more === 1 ? 'line' : 'lines'} in the output region.`
    : `Output: ${spoken}`
}
