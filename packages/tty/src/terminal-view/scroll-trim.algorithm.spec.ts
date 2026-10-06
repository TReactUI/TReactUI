import { lostAnOldLine } from './scroll-trim.algorithm'

describe('lostAnOldLine', () => {
  const capacity = 1024

  it('is false while the buffer is still growing', () => {
    expect(lostAnOldLine(24, 25, capacity)).toBe(false)
    expect(lostAnOldLine(500, 501, capacity)).toBe(false)
  })

  it('is false on the scroll that fills the buffer, which loses nothing yet', () => {
    expect(lostAnOldLine(1023, 1024, capacity)).toBe(false)
  })

  it('is true for every scroll after that, when the buffer stays full', () => {
    expect(lostAnOldLine(1024, 1024, capacity)).toBe(true)
  })

  it('counts exactly the lines lost: capacity 1024 and 5 000 lines printed lose 3 977', () => {
    // Replays what xterm does for a program that prints `printed` lines into a terminal of 24 rows.
    let length = 24
    let lost = 0
    const printed = 5000
    for (let line = 24; line < printed + 1; line++) {
      const before = length
      length = Math.min(capacity, length + 1)
      if (lostAnOldLine(before, length, capacity)) lost++
    }

    expect(lost).toBe(3977)
  })
})
