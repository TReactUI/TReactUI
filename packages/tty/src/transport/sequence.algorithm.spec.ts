import { createSequencer } from './sequence.algorithm'

describe('createSequencer', () => {
  it('hands items out in the order of their numbers, holding back one that comes early', () => {
    const sequencer = createSequencer<string>()

    expect(sequencer.push(2, 'c')).toEqual([])
    expect(sequencer.push(0, 'a')).toEqual(['a'])
    expect(sequencer.push(1, 'b')).toEqual(['b', 'c'])
    expect(sequencer.push(3, 'd')).toEqual(['d'])
  })

  it('ignores a repeat of an item already handed out', () => {
    const sequencer = createSequencer<string>()
    sequencer.push(0, 'a')

    expect(sequencer.push(0, 'again')).toEqual([])
  })
})
