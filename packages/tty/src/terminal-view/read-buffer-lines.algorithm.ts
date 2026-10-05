/** The part of xterm.js's buffer this reads; lets a test supply plain lines. */
export interface BufferLike {
  length:  number
  getLine: (index: number) => { translateToString: (trimRight?: boolean) => string } | undefined
}

/**
 * The text of the terminal buffer, one string per line with trailing spaces
 * removed, and the blank lines before the first and after the last printed
 * line dropped (a terminal is mostly empty rows).
 */
export function readBufferLines (buffer: BufferLike): string[] {
  const lines: string[] = []
  for (let index = 0; index < buffer.length; index++) {
    lines.push(buffer.getLine(index)?.translateToString(true) ?? '')
  }

  let start = 0
  let end = lines.length
  while (start < end && lines[start] === '') start++
  while (end > start && lines[end - 1] === '') end--

  return lines.slice(start, end)
}
