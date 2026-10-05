import { runInkSession } from '../ink-session'
import type { InkSessionOptions } from '../ink-session'
import { serveTty } from '../websocket-server'
import type { ServeTtyOptions, TtyServer } from '../websocket-server'

export type ServeInkOptions = Omit<ServeTtyOptions, 'createSession'> & InkSessionOptions

/**
 * Serves an Ink app: every browser that connects gets its own instance, rendered
 * in this process.
 *
 * @example
 * await serveInk({ render: ({ stdin, stdout }) => render(<App />, { stdin, stdout, patchConsole: false }) })
 */
export async function serveInk (options: ServeInkOptions): Promise<TtyServer> {
  const { port, host, path, allowedOrigins, ...session } = options

  return serveTty({ port, host, path, allowedOrigins, createSession: transport => runInkSession(transport, session) })
}
