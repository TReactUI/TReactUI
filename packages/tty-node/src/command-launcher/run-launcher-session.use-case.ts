import { PROTOCOL_VERSION, encodeServerMessage, parseClientMessage } from '@trectui/protocol'
import type { ServerMessage } from '@trectui/protocol'
import { startPtyProgram } from '../pty-session'
import type { SessionController, TerminalSize } from '../session-lifecycle'
import type { Transport } from '../session-transport'
import type { LauncherOptions } from './launcher.contract'

const DEFAULT_SIZE: TerminalSize = { cols: 80, rows: 24 }
const CRLF = '\r\n'

/**
 * Offers a catalog of commands to the browser and runs the one it picks, one
 * at a time, in a PTY. Unlike a plain session, the connection outlives each
 * command: when one exits the browser may pick another.
 *
 * The browser can only choose a command from the catalog and supply its
 * arguments, which reach the program as an argument list, never through a shell.
 */
export function runLauncherSession (transport: Transport, options: LauncherOptions): void {
  const send = (message: ServerMessage): void => transport.send(encodeServerMessage(message))
  const known = new Map(options.commands.map(command => [command.name, command]))

  let size = DEFAULT_SIZE
  let busy = false
  let closed = false
  let controller: SessionController | undefined

  const finished = (): void => {
    busy = false
    controller = undefined
  }

  const run = async (name: string, args: string[]): Promise<void> => {
    const command = known.get(name)
    if (command === undefined) {
      send({ type: 'announce', text: `Unknown command "${name}"`, politeness: 'assertive' })

      return
    }
    if (busy) return
    busy = true
    try {
      const running = await startPtyProgram(
        { ...options, args: [...(options.args ?? []), ...command.name.split(' '), ...args] },
        size,
        { send, close: finished },
      )
      if (closed) running.dispose()
      else controller = running
    } catch (error) {
      send({ type: 'output', data: CRLF + (error instanceof Error ? error.message : String(error)) + CRLF })
      send({ type: 'event', name: 'exit', payload: { exitCode: 1 } })
      finished()
    }
  }

  send({ type: 'hello', version: PROTOCOL_VERSION })
  send({ type: 'commands', commands: options.commands })

  transport.onFrame(frame => {
    const parsed = parseClientMessage(frame)
    if (!parsed.ok) return
    const { message } = parsed
    switch (message.type) {
      case 'resize': {
        size = { cols: message.cols, rows: message.rows }
        controller?.resize(size.cols, size.rows)
        break
      }
      case 'input': {
        controller?.write(message.data)
        break
      }
      case 'run': {
        void run(message.command, message.args)
        break
      }
      case 'stop': {
        controller?.dispose()
        break
      }
    }
  })

  transport.onClose(() => {
    closed = true
    controller?.dispose()
  })
}
