import { encodeClientMessage, parseServerMessage } from '../protocol'
import type { SocketLike, TtyConnection, TtyConnectionOptions } from './tty-connection.contract'

const createBrowserSocket = (url: string): SocketLike => new WebSocket(url)

/** Opens the WebSocket to the backend and speaks the protocol over it. */
export function openTtyConnection (options: TtyConnectionOptions): TtyConnection {
  const socket = (options.createSocket ?? createBrowserSocket)(options.url)
  let open = false
  const pending: string[] = []

  socket.addEventListener('open', () => {
    open = true
    const frames = [...pending]
    pending.length = 0
    for (const frame of frames) socket.send(frame)
    options.onOpen?.()
  })
  socket.addEventListener('close', () => {
    open = false
    options.onClose?.()
  })
  socket.addEventListener('message', event => {
    const parsed = parseServerMessage(String(event.data))
    if (parsed.ok) options.onMessage(parsed.message)
    else options.onProtocolError?.(parsed.reason)
  })

  return {
    send (message) {
      const frame = encodeClientMessage(message)
      if (open) socket.send(frame)
      else pending.push(frame)
    },
    close () {
      socket.close()
    },
  }
}
