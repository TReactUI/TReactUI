import { isFocusEscapeChord } from './focus-escape.policy'

const chord = (key: string, mods: Partial<{ ctrlKey: boolean, shiftKey: boolean, altKey: boolean }> = {}) =>
  ({ key, ctrlKey: false, shiftKey: false, altKey: false, ...mods })

describe('isFocusEscapeChord', () => {
  it('matches Ctrl+Shift+M in either case', () => {
    expect(isFocusEscapeChord(chord('M', { ctrlKey: true, shiftKey: true }))).toBe(true)
    expect(isFocusEscapeChord(chord('m', { ctrlKey: true, shiftKey: true }))).toBe(true)
  })

  it('leaves every other key to the terminal', () => {
    expect(isFocusEscapeChord(chord('m', { ctrlKey: true }))).toBe(false)
    expect(isFocusEscapeChord(chord('Tab'))).toBe(false)
    expect(isFocusEscapeChord(chord('m', { ctrlKey: true, shiftKey: true, altKey: true }))).toBe(false)
  })
})
