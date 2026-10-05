import type { A11ySnapshot, Politeness } from '@treactui/protocol'

/** What the render function receives: terminal-like streams, and a way to speak to the page. */
export interface InkSessionContext {
  stdin:           NodeJS.ReadStream
  stdout:          NodeJS.WriteStream
  announce:        (text: string, politeness?: Politeness) => void
  publishSnapshot: (snapshot: A11ySnapshot) => void
  /** A web-only action for the host page (see `onEvent` on the TTY component). */
  emitEvent:       (name: string, payload?: unknown) => void
}

/** The part of an Ink instance the session uses. */
export interface InkInstanceLike {
  unmount:       () => void
  waitUntilExit: () => Promise<unknown>
}

export interface InkSessionOptions {
  /**
   * Renders the app with the given streams and returns the Ink instance.
   *
   * @example
   * render: ({ stdin, stdout }) => render(<App />, { stdin, stdout, patchConsole: false })
   */
  render:        (context: InkSessionContext) => InkInstanceLike | Promise<InkInstanceLike>
  /** Used when the browser has not reported a size within this many milliseconds. Default 500. */
  startDelayMs?: number
}
