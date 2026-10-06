import { summarizeCommandOutput } from './summarize-command-output.algorithm'

describe('summarizeCommandOutput', () => {
  it('reads a short output whole, adding a full stop only where there is none', () => {
    expect(summarizeCommandOutput(['Hello, Ada!', 'Done'])).toBe('Output: Hello, Ada! Done.')
  })

  it('says so when there is no output, ignoring blank lines', () => {
    expect(summarizeCommandOutput([])).toBe('No output.')
    expect(summarizeCommandOutput(['', ' '.repeat(3)])).toBe('No output.')
  })

  it('reads the first lines and counts the rest', () => {
    const lines = Array.from({ length: 9 }, (_, index) => `line ${index + 1}`)

    expect(summarizeCommandOutput(lines)).toBe('Output: line 1. line 2. line 3. line 4. line 5. line 6. And 3 more lines in the output region.')
  })

  it('stops at a length limit and uses the singular for one remaining line', () => {
    const long = 'x'.repeat(200)

    expect(summarizeCommandOutput([long, long, 'tail'])).toBe(`Output: ${long}. And 2 more lines in the output region.`)
    expect(summarizeCommandOutput([long, 'tail'])).toBe(`Output: ${long}. tail.`)
  })

  it('shortens a single enormous line instead of dropping it', () => {
    const summary = summarizeCommandOutput(['y'.repeat(1000)])

    expect(summary.startsWith('Output: ' + 'y'.repeat(300))).toBe(true)
    expect(summary).toContain('…')
  })

  describe('when the terminal had already discarded the start of the output', () => {
    it('says how many lines are gone and reads the last lines, not the first', () => {
      const lines = Array.from({ length: 9 }, (_, index) => `line ${index + 3978}`)

      expect(summarizeCommandOutput(lines, 3977)).toBe(
        'Output: the first 3977 lines are no longer available. The last lines: line 3981. line 3982. line 3983. line 3984. line 3985. line 3986. And 3 more lines before them in the output region.',
      )
    })

    it('reads everything that is left when it is short, and still says what is gone', () => {
      expect(summarizeCommandOutput(['Build failed', 'exit 2'], 1)).toBe('Output: the first 1 line are no longer available. The last lines: Build failed. exit 2.')
    })

    it('says so when nothing is left to read', () => {
      expect(summarizeCommandOutput([], 5000)).toBe('Output: the 5000 lines it printed are no longer available.')
    })

    it('keeps the last of a single enormous line, with its ellipsis', () => {
      const summary = summarizeCommandOutput(['z'.repeat(1000)], 10)

      expect(summary).toContain('no longer available')
      expect(summary).toContain('z'.repeat(300) + '…')
    })

    it('does not change the summary of an output that was kept whole', () => {
      expect(summarizeCommandOutput(['Hello, Ada!', 'Done'], 0)).toBe('Output: Hello, Ada! Done.')
    })
  })
})
