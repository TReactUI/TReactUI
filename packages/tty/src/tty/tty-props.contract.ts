import type { SocketLike } from '../transport'

export interface TTYProps {
  /** WebSocket URL of a backend that speaks the @treactui protocol. Not needed with `createSocket`. */
  url?:          string
  /** Accessible name of the terminal. */
  label?:        string
  className?:    string
  /** Called for backend `event` messages: the hook for web-only actions such as a file picker. */
  onEvent?:      (name: string, payload: unknown) => void
  /**
   * Replaces `new WebSocket(url)`: another transport, such as {@link createWailsSocket}, or a fake in tests.
   * Pass the same function on every render (create it once), or the terminal reconnects each time.
   */
  createSocket?: (url: string) => SocketLike
}
