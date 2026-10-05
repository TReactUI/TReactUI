import { describeCommanderProgram } from '../commander-catalog'
import type { CommanderCommandLike } from '../commander-catalog'
import { runLauncherSession } from '../command-launcher'
import type { LauncherOptions } from '../command-launcher'
import { serveTty } from '../websocket-server'
import type { ServeTtyOptions, TtyServer } from '../websocket-server'

export type ServeCommanderOptions = Omit<ServeTtyOptions, 'createSession'> & Omit<LauncherOptions, 'commands'> & {
  /** The commander program whose commands the browser may run; it is read for its metadata only. */
  program: CommanderCommandLike
}

/**
 * Serves a commander CLI with a launcher: the browser shows an accessible form
 * built from the program's commands, arguments and options, then runs the
 * chosen command in a terminal.
 *
 * @example
 * await serveCommander({ program, command: process.execPath, args: ['cli.js'], allowedOrigins: ['localhost:4200'] })
 */
export async function serveCommander (options: ServeCommanderOptions): Promise<TtyServer> {
  const { port, host, path, allowedOrigins, program, ...launcher } = options
  const commands = describeCommanderProgram(program)

  return serveTty({
    port,
    host,
    path,
    allowedOrigins,
    createSession: transport => runLauncherSession(transport, { ...launcher, commands }),
  })
}
