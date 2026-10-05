import { readBufferLines } from './read-buffer-lines.algorithm'

const bufferOf = (rows: string[]) => ({
  length:  rows.length,
  getLine: (index: number) => rows[index] === undefined ? undefined : { translateToString: (trim?: boolean) => trim === true ? rows[index]?.trimEnd() ?? '' : rows[index] ?? '' },
})

describe('readBufferLines', () => {
  it('returns the printed lines without the empty rows around them', () => {
    expect(readBufferLines(bufferOf(['', '', 'Hello, Ada!', '', '', '']))).toEqual(['Hello, Ada!'])
  })

  it('keeps blank lines between printed ones and trims trailing spaces', () => {
    const buffer = bufferOf(['one   ', '', 'two', ' '.repeat(3)])

    expect(readBufferLines(buffer)).toEqual(['one', '', 'two'])
  })

  it('returns nothing for an empty terminal', () => {
    expect(readBufferLines(bufferOf(['', '  ', '']))).toEqual([])
    expect(readBufferLines(bufferOf([]))).toEqual([])
  })
})
