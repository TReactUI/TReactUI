import { serveCommand } from '../serve-command'
import type { TtyServer } from '../websocket-server'
import type { ServeCommandOptions } from '../serve-command'
import { CLI_HELP } from './cli-help.config'
import { parseCliArguments } from './parse-cli-arguments.algorithm'

export interface CliEnvironment {
  version:     string
  write:       (text: string) => void
  writeError:  (text: string) => void
  /** Resolves when the user asks to stop (Ctrl+C). */
  waitForStop: () => Promise<void>
  /** Defaults to {@link serveCommand}. */
  serve?:      (options: ServeCommandOptions) => Promise<TtyServer>
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])

/** Runs the `treactui` command line and resolves with the process exit code. */
export async function runCli (argv: readonly string[], environment: CliEnvironment): Promise<number> {
  const command = parseCliArguments(argv)
  switch (command.kind) {
    case 'help': {
      environment.write(CLI_HELP)

      return 0
    }
    case 'version': {
      environment.write(`${environment.version}\n`)

      return 0
    }
    case 'error': {
      environment.writeError(`treactui: ${command.message}\n`)

      return 2
    }
    case 'serve': {
      const serve = environment.serve ?? serveCommand
      let server: TtyServer
      try {
        server = await serve(command.options)
      } catch (error) {
        environment.writeError(`treactui: cannot start the server: ${error instanceof Error ? error.message : String(error)}\n`)

        return 1
      }

      const host = command.options.host ?? '127.0.0.1'
      const path = command.options.path ?? '/term'
      const shown = host.includes(':') ? `[${host}]` : host
      environment.write(`Serving "${[command.options.command, ...(command.options.args ?? [])].join(' ')}" at ws://${shown}:${server.port}${path}\n`)
      environment.write('Point <TTY url="..."/> at it. Press Ctrl+C to stop.\n')
      if (!LOOPBACK_HOSTS.has(host)) {
        environment.writeError(`treactui: warning: ${host} is not a loopback address, so anyone who can reach it and passes the origin check can run this program.\n`)
      }

      await environment.waitForStop()
      await server.close()

      return 0
    }
  }
}
