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
})
