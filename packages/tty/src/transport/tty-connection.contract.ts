import type { ClientMessage, ServerMessage } from '../protocol'

/** The slice of the WebSocket API the connection relies on; lets tests supply a fake. */
export interface SocketLike {
  send:             (frame: string) => void
  close:            () => void
  addEventListener: (type: 'open' | 'close' | 'message', listener: (event: { data?: unknown }) => void) => void
}

export interface TtyConnectionOptions {
  url:              string
  onMessage:        (message: ServerMessage) => void
  onOpen?:          () => void
  onClose?:         () => void
  /** Called for a frame that is not a valid {@link ServerMessage}. */
  onProtocolError?: (reason: string) => void
  /** Defaults to `new WebSocket(url)`. */
  createSocket?:    (url: string) => SocketLike
}

export interface TtyConnection {
  send:  (message: ClientMessage) => void
  close: () => void
}
