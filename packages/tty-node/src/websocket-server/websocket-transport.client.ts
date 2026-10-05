import type { WebSocket } from 'ws'
import type { Transport } from '../session-transport'

/** Adapts one accepted WebSocket to the session transport. */
export function createWebSocketTransport (socket: WebSocket): Transport {
  return {
    send (frame) {
      if (socket.readyState === socket.OPEN) socket.send(frame)
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
  }
}
