import { ANNOUNCEMENT_INTERVAL_MS, createAnnouncementLimiter } from './announcement-limiter.store'
import type { Announcement } from './announcement-limiter.store'

const polite = (text: string): Announcement => ({ text, politeness: 'polite' })
const assertive = (text: string): Announcement => ({ text, politeness: 'assertive' })
const texts = (deliver: jest.Mock): string[] => deliver.mock.calls.map(call => (call[0] as Announcement).text)

describe('createAnnouncementLimiter', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('delivers the first announcement at once', () => {
    const deliver = jest.fn()
    createAnnouncementLimiter(deliver).offer(polite('one'))

    expect(texts(deliver)).toEqual(['one'])
  })

  it('holds what comes within the interval and delivers only the latest when it is up', () => {
    const deliver = jest.fn()
    const limiter = createAnnouncementLimiter(deliver)

    limiter.offer(polite('one'))
    limiter.offer(polite('two'))
    limiter.offer(polite('three'))
    expect(deliver).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(ANNOUNCEMENT_INTERVAL_MS)

    expect(texts(deliver)).toEqual(['one', 'three'])
  })

  it('keeps delivering at most one announcement per interval while they keep coming', () => {
    const deliver = jest.fn()
    const limiter = createAnnouncementLimiter(deliver)

    // 200 a second for 10 seconds, as a program in a loop would.
    for (let milliseconds = 0; milliseconds < 10_000; milliseconds += 5) {
      limiter.offer(polite(`item ${milliseconds}`))
      jest.advanceTimersByTime(5)
    }

    expect(deliver.mock.calls.length).toBeLessThanOrEqual(Math.ceil(10_000 / ANNOUNCEMENT_INTERVAL_MS) + 1)
    expect(deliver.mock.calls.length).toBeGreaterThan(10)
  })

  it('is idle again once an interval ends with nothing held, so the next announcement is immediate', () => {
    const deliver = jest.fn()
    const limiter = createAnnouncementLimiter(deliver)
    limiter.offer(polite('one'))
    jest.advanceTimersByTime(ANNOUNCEMENT_INTERVAL_MS)

    limiter.offer(polite('later'))

    expect(texts(deliver)).toEqual(['one', 'later'])
  })

  it('does not let a polite announcement displace an assertive one that is waiting', () => {
    const deliver = jest.fn()
    const limiter = createAnnouncementLimiter(deliver)

    limiter.offer(polite('one'))
    limiter.offer(assertive('Failed'))
    limiter.offer(polite('and then this'))
    jest.advanceTimersByTime(ANNOUNCEMENT_INTERVAL_MS)

    expect(texts(deliver)).toEqual(['one', 'Failed'])
  })

  it('lets a later assertive announcement replace a waiting assertive one', () => {
    const deliver = jest.fn()
    const limiter = createAnnouncementLimiter(deliver)

    limiter.offer(polite('one'))
    limiter.offer(assertive('first failure'))
    limiter.offer(assertive('second failure'))
    jest.advanceTimersByTime(ANNOUNCEMENT_INTERVAL_MS)

    expect(texts(deliver)).toEqual(['one', 'second failure'])
  })

  it('delivers the same text again when it is announced again', () => {
    const deliver = jest.fn()
    const limiter = createAnnouncementLimiter(deliver)
    limiter.offer(polite('Saved'))
    jest.advanceTimersByTime(ANNOUNCEMENT_INTERVAL_MS)

    limiter.offer(polite('Saved'))

    expect(deliver).toHaveBeenCalledTimes(2)
  })

  it('drops what is held and stops when disposed', () => {
    const deliver = jest.fn()
    const limiter = createAnnouncementLimiter(deliver)
    limiter.offer(polite('one'))
    limiter.offer(polite('held'))

    limiter.dispose()
    jest.advanceTimersByTime(ANNOUNCEMENT_INTERVAL_MS * 3)

    expect(deliver).toHaveBeenCalledTimes(1)
  })
})
