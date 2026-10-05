import type { ServerMessage } from '@treactui/protocol'

export interface TerminalSize {
  cols: number
  rows: number
}

/** What a running program lets the lifecycle do to it. */
export interface SessionController {
  write:   (data: string) => void
  resize:  (cols: number, rows: number) => void
  /** Stop the program. Called when the browser leaves. */
  dispose: () => void
}

/** What a starting program can say to the browser. */
export interface SessionHost {
  send:  (message: ServerMessage) => void
  /** Ends the connection, for instance when the program has exited. */
  close: () => void
}

export interface SessionOptions {
  /**
   * Starts the program at `size`. Throw to report that it could not start; the
   * message is shown in the terminal and the connection closes.
   */
  start:         (size: TerminalSize, host: SessionHost) => SessionController | Promise<SessionController>
  /** Used when the browser has not reported a size within this many milliseconds. Default 500. */
  startDelayMs?: number
}
