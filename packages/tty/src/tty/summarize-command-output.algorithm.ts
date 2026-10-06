const MAX_LINES = 6
const MAX_CHARS = 300

const endsSentence = /[!.:;?]$/

const asSentence = (line: string): string => endsSentence.test(line) ? line : `${line}.`

/**
 * A sentence for a screen reader to read when a command ends: its first few
 * lines, and how many more there are. Whole output stays available in a region.
 *
 * When `droppedLines` is above zero the terminal had already thrown away the start of what the command printed,
 * so `lines` is only its end: the sentence then says how many lines are gone and reads the last ones, which
 * is where a long command's result, or its error, is.
 */
export function summarizeCommandOutput (lines: string[], droppedLines = 0): string {
  const printed = lines.map(line => line.trim()).filter(line => line !== '')
  if (printed.length === 0) return droppedLines > 0 ? `Output: the ${droppedLines} lines it printed are no longer available.` : 'No output.'
  if (droppedLines > 0) return summarizeOutputTail(printed, droppedLines)

  const taken: string[] = []
  let chars = 0
  for (const line of printed) {
    if (taken.length >= MAX_LINES || chars + line.length > MAX_CHARS) break
    taken.push(line)
    chars += line.length
  }
  // A single very long line is shortened rather than dropped.
  if (taken.length === 0) taken.push(`${printed[0]?.slice(0, MAX_CHARS) ?? ''}…`)

  const spoken = taken.map(line => asSentence(line)).join(' ')
  const more = printed.length - taken.length

  return more > 0
    ? `Output: ${spoken} And ${more} more ${more === 1 ? 'line' : 'lines'} in the output region.`
    : `Output: ${spoken}`
}

/** The summary of a long output whose start is gone: the last few lines, and what came before them. */
function summarizeOutputTail (printed: string[], droppedLines: number): string {
  const taken: string[] = []
  let chars = 0
  for (let index = printed.length - 1; index >= 0; index--) {
    const line = printed[index]
    if (taken.length >= MAX_LINES || chars + line.length > MAX_CHARS) break
    taken.unshift(line)
    chars += line.length
  }
  if (taken.length === 0) taken.push(`${printed.at(-1)?.slice(0, MAX_CHARS) ?? ''}…`)

  const spoken = taken.map(line => asSentence(line)).join(' ')
  const before = printed.length - taken.length
  const gone = `${droppedLines} ${droppedLines === 1 ? 'line' : 'lines'}`

  return before > 0
    ? `Output: the first ${gone} are no longer available. The last lines: ${spoken} And ${before} more ${before === 1 ? 'line' : 'lines'} before them in the output region.`
    : `Output: the first ${gone} are no longer available. The last lines: ${spoken}`
}
