import type { WebSocket } from 'ws'
import { BACKED_UP_ABOVE_BYTES, CAUGHT_UP_BELOW_BYTES, createWebSocketTransport } from './websocket-transport.client'

/** A socket whose writes complete only when the test says so: a browser that is slow to read. */
function slowSocket () {
  const completions: Array<() => void> = []
  const socket = {
    OPEN:       1,
    readyState: 1,
    send:       (_frame: string, callback: () => void) => { completions.push(callback) },
    on:         () => undefined,
    close:      () => undefined,
  }

  return {
    socket:  socket as unknown as WebSocket,
    close:   () => { socket.readyState = 3 },
    /** The browser has read the oldest `count` frames that were still unread. */
    deliver: (count: number) => { for (const complete of completions.splice(0, count)) complete() },
    unread:  () => completions.length,
  }
}

const frameOf = (bytes: number): string => 'x'.repeat(bytes)

describe('createWebSocketTransport flow control', () => {
  it('is not backed up while the browser keeps up', () => {
    const { socket, deliver } = slowSocket()
    const transport = createWebSocketTransport(socket)

    transport.send(frameOf(BACKED_UP_ABOVE_BYTES))
    deliver(1)

    expect(transport.isBackedUp?.()).toBe(false)
  })

  it('is backed up once more than the limit has been sent and not yet delivered', () => {
    const { socket } = slowSocket()
    const transport = createWebSocketTransport(socket)

    transport.send(frameOf(BACKED_UP_ABOVE_BYTES))
    expect(transport.isBackedUp?.()).toBe(false)
    transport.send(frameOf(1))

    expect(transport.isBackedUp?.()).toBe(true)
  })

  it('counts bytes, not characters', () => {
    const { socket } = slowSocket()
    const transport = createWebSocketTransport(socket)

    // 400 000 three-byte characters are 1 200 000 bytes and 400 000 characters.
    transport.send('日'.repeat(400_000))

    expect(transport.isBackedUp?.()).toBe(true)
  })

  it('announces the catch-up once, when the backlog falls below the lower mark, not at the limit', () => {
    const { socket, deliver } = slowSocket()
    const transport = createWebSocketTransport(socket)
    const drained = jest.fn()
    transport.onDrain?.(drained)

    // Four frames of 400 000 bytes: 1 600 000 pending, over the limit.
    for (let count = 0; count < 4; count++) transport.send(frameOf(400_000))
    expect(transport.isBackedUp?.()).toBe(true)

    deliver(1) // 1 200 000 left: still over the limit
    deliver(1) // 800 000 left: under the limit, but not yet caught up
    expect(transport.isBackedUp?.()).toBe(true)
    expect(drained).not.toHaveBeenCalled()

    deliver(1) // 400 000 left: above the lower mark still
    expect(drained).not.toHaveBeenCalled()
    deliver(1) // nothing left
    expect(transport.isBackedUp?.()).toBe(false)
    expect(drained).toHaveBeenCalledTimes(1)
    expect(CAUGHT_UP_BELOW_BYTES).toBeLessThan(400_000)
  })

  it('announces a second catch-up after a second backlog', () => {
    const { socket, deliver } = slowSocket()
    const transport = createWebSocketTransport(socket)
    const drained = jest.fn()
    transport.onDrain?.(drained)

    for (let round = 0; round < 2; round++) {
      transport.send(frameOf(BACKED_UP_ABOVE_BYTES + 1))
      deliver(1)
    }

    expect(drained).toHaveBeenCalledTimes(2)
  })

  it('stops calling a handler that was removed', () => {
    const { socket, deliver } = slowSocket()
    const transport = createWebSocketTransport(socket)
    const kept = jest.fn()
    const removed = jest.fn()
    transport.onDrain?.(kept)
    const stop = transport.onDrain?.(removed)
    stop?.()

    transport.send(frameOf(BACKED_UP_ABOVE_BYTES + 1))
    deliver(1)

    expect(kept).toHaveBeenCalledTimes(1)
    expect(removed).not.toHaveBeenCalled()
  })

  it('sends nothing, and counts nothing, on a socket that is not open', () => {
    const { socket, close, unread } = slowSocket()
    const transport = createWebSocketTransport(socket)
    close()

    transport.send(frameOf(BACKED_UP_ABOVE_BYTES + 1))

    expect(unread()).toBe(0)
    expect(transport.isBackedUp?.()).toBe(false)
  })
})
