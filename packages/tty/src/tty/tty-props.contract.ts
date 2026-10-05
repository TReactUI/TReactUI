import type { SocketLike } from '../transport'

export interface TTYProps {
  /** WebSocket URL of a backend that speaks the @treactui protocol. */
  url:           string
  /** Accessible name of the terminal. */
  label?:        string
  className?:    string
  /** Called for backend `event` messages: the hook for web-only actions such as a file picker. */
  onEvent?:      (name: string, payload: unknown) => void
  /** Replaces `new WebSocket(url)`; mainly for tests. */
  createSocket?: (url: string) => SocketLike
}
