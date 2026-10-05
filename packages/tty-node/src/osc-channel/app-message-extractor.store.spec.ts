import { createAppMessageExtractor } from './app-message-extractor.store'

const START = '\u{1B}]7770;'

describe('createAppMessageExtractor', () => {
  it('passes plain terminal text straight through', () => {
    expect(createAppMessageExtractor().push('hello\r\n')).toEqual({ output: 'hello\r\n', messages: [] })
  })

  it('removes a message terminated by BEL and keeps the text around it', () => {
    const result = createAppMessageExtractor().push(`before${START}{"a":1}\u{7}after`)

    expect(result).toEqual({ output: 'beforeafter', messages: ['{"a":1}'] })
  })

  it('accepts the ST terminator and several messages in one chunk', () => {
    const result = createAppMessageExtractor().push(`${START}one\u{1B}\\x${START}two\u{7}`)

    expect(result).toEqual({ output: 'x', messages: ['one', 'two'] })
  })

  it('reassembles a message cut anywhere across chunks', () => {
    const whole = `a${START}{"k":"v"}\u{7}b`
    for (let cut = 1; cut < whole.length; cut++) {
      const extractor = createAppMessageExtractor()
      const first = extractor.push(whole.slice(0, cut))
      const second = extractor.push(whole.slice(cut))

      expect(first.output + second.output).toBe('ab')
      expect([...first.messages, ...second.messages]).toEqual(['{"k":"v"}'])
    }
  })

  it('does not swallow an escape sequence that merely starts like the channel', () => {
    const extractor = createAppMessageExtractor()
    const first = extractor.push('x\u{1B}]')
    const second = extractor.push('0;title\u{7}')

    expect(first.output + second.output).toBe('x\u{1B}]0;title\u{7}')
    expect(second.messages).toEqual([])
  })

  it('stops buffering an unterminated message once it is implausibly large', () => {
    const extractor = createAppMessageExtractor()
    const result = extractor.push(START + 'x'.repeat(1_000_001))

    expect(result.messages).toEqual([])
    expect(result.output.length).toBeGreaterThan(1_000_000)
  })
})
