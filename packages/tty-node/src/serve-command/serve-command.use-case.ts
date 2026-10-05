import { runPtySession } from '../pty-session'
import type { PtySessionOptions } from '../pty-session'
import { serveTty } from '../websocket-server'
import type { ServeTtyOptions, TtyServer } from '../websocket-server'

export type ServeCommandOptions = Omit<ServeTtyOptions, 'createSession'> & PtySessionOptions

/**
 * Serves one program: every browser that connects gets its own copy of
 * `command` running in a PTY.
 *
 * @example
 * await serveCommand({ command: 'node', args: ['my-cli.js'], allowedOrigins: ['localhost:4200'] })
 */
export async function serveCommand (options: ServeCommandOptions): Promise<TtyServer> {
  const { port, host, path, allowedOrigins, ...session } = options

  return serveTty({ port, host, path, allowedOrigins, createSession: transport => runPtySession(transport, session) })
}
