import type { WebSocket } from 'ws'
import type { Transport } from '../session-transport'

/** Behind by more than this, and a program that can wait is made to (about a second of fast output). */
export const BACKED_UP_ABOVE_BYTES = 1_048_576
/** A backed-up connection is caught up once it is below this, so it does not flap around the limit. */
export const CAUGHT_UP_BELOW_BYTES = 262_144

/** Adapts one accepted WebSocket to the session transport. */
export function createWebSocketTransport (socket: WebSocket): Transport {
  // Bytes handed to the socket whose write has not completed: the browser, or the network, is not keeping up.
  let pending = 0
  let backedUp = false
  const drainHandlers: Array<() => void> = []

  const settle = (bytes: number): void => {
    pending -= bytes
    if (backedUp && pending < CAUGHT_UP_BELOW_BYTES) {
      backedUp = false
      for (const handler of drainHandlers) handler()
    }
  }

  return {
    send (frame) {
      if (socket.readyState !== socket.OPEN) return
      const bytes = Buffer.byteLength(frame)
      pending += bytes
      if (pending > BACKED_UP_ABOVE_BYTES) backedUp = true
      // The callback runs when the frame has been written out, or has failed; either way it no longer weighs.
      socket.send(frame, () => { settle(bytes) })
    },
    onFrame (handler) {
      socket.on('message', data => handler(String(data)))
    },
    onClose (handler) {
      socket.on('close', handler)
    },
    close () {
      socket.close()
    },
    isBackedUp: () => backedUp,
    onDrain (handler) {
      drainHandlers.push(handler)

      return () => {
        const index = drainHandlers.indexOf(handler)
        if (index !== -1) drainHandlers.splice(index, 1)
      }
    },
  }
}
