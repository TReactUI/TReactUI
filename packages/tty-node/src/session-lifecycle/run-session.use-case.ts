import { PROTOCOL_VERSION, encodeServerMessage, parseClientMessage } from '@treactui/protocol'
import type { ServerMessage } from '@treactui/protocol'
import type { Transport } from '../session-transport'
import type { SessionController, SessionOptions, TerminalSize } from './session.contract'

const DEFAULT_SIZE: TerminalSize = { cols: 80, rows: 24 }

/**
 * The part of serving a program that does not depend on how it runs: greet the
 * browser, start the program at the size the browser reports (or after
 * `startDelayMs`), hold input typed before it exists, pass resizes through, and
 * stop it when the browser leaves.
 */
export function runSession (transport: Transport, options: SessionOptions): void {
  const send = (message: ServerMessage): void => transport.send(encodeServerMessage(message))
  const host = { send, close: () => transport.close() }

  let size = DEFAULT_SIZE
  let started = false
  let closed = false
  let controller: SessionController | undefined
  const queuedInput: string[] = []

  const start = (): void => {
    if (started) return
    started = true
    clearTimeout(fallback)
    void (async () => {
      try {
        const running = await options.start(size, host)
        if (closed) {
          running.dispose()

          return
        }
        controller = running
        const early = [...queuedInput]
        queuedInput.length = 0
        for (const data of early) running.write(data)
      } catch (error) {
        send({ type: 'output', data: `\r\n${error instanceof Error ? error.message : String(error)}\r\n` })
        transport.close()
      }
    })()
  }

  const fallback = setTimeout(start, options.startDelayMs ?? 500)

  send({ type: 'hello', version: PROTOCOL_VERSION })

  transport.onFrame(frame => {
    const parsed = parseClientMessage(frame)
    if (!parsed.ok) return
    if (parsed.message.type === 'resize') {
      size = { cols: parsed.message.cols, rows: parsed.message.rows }
      if (controller === undefined) start()
      else controller.resize(size.cols, size.rows)
    } else if (parsed.message.type === 'input') {
      if (controller === undefined) {
        queuedInput.push(parsed.message.data)
        start()
      } else {
        controller.write(parsed.message.data)
      }
    }
    // `run` and `stop` belong to the command launcher; a session that serves one program ignores them.
  })

  transport.onClose(() => {
    closed = true
    clearTimeout(fallback)
    controller?.dispose()
  })
}
