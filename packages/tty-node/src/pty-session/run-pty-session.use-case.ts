import { PROTOCOL_VERSION, encodeServerMessage, parseClientMessage, parseServerMessage } from '@trectui/protocol'
import type { ServerMessage } from '@trectui/protocol'
import { APP_CHANNEL_ENV, createAppMessageExtractor } from '../osc-channel'
import type { Transport } from '../session-transport'
import { spawnWithNodePty } from './node-pty.client'
import type { PtyLike, PtySessionOptions } from './pty.contract'

const DEFAULT_SIZE = { cols: 80, rows: 24 }

/** What a served program may say to the page; its terminal output travels as `output`, never through this path. */
const APP_MESSAGE_TYPES = new Set<ServerMessage['type']>(['a11y-snapshot', 'announce', 'event'])

const isAppMessage = (message: ServerMessage): boolean =>
  APP_MESSAGE_TYPES.has(message.type)

/**
 * Runs `options.command` in a PTY for one browser. The program starts when the
 * browser first reports its size (or after `startDelayMs`), so it sees the real
 * terminal size from its first line of output. Messages the program publishes
 * through the application channel are turned into protocol messages.
 */
export function runPtySession (transport: Transport, options: PtySessionOptions): void {
  const spawn = options.spawnPty ?? spawnWithNodePty
  const extractor = createAppMessageExtractor()
  const send = (message: ServerMessage): void => transport.send(encodeServerMessage(message))

  let size = DEFAULT_SIZE
  let started = false
  let closed = false
  let pty: PtyLike | undefined
  const queuedInput: string[] = []

  const start = (): void => {
    if (started) return
    started = true
    clearTimeout(fallback)
    void (async () => {
      try {
        const spawned = await spawn(options.command, options.args ?? [], {
          ...size,
          cwd: options.cwd,
          env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', ...options.env, [APP_CHANNEL_ENV]: '1' },
        })
        if (closed) {
          spawned.kill()

          return
        }
        pty = spawned
        spawned.onData(data => {
          const { output, messages } = extractor.push(data)
          if (output !== '') send({ type: 'output', data: output })
          for (const raw of messages) {
            const parsed = parseServerMessage(raw)
            if (parsed.ok && isAppMessage(parsed.message)) send(parsed.message)
          }
        })
        spawned.onExit(exitCode => {
          send({ type: 'event', name: 'exit', payload: { exitCode } })
          transport.close()
        })
        const early = [...queuedInput]
        queuedInput.length = 0
        for (const data of early) spawned.write(data)
      } catch (error) {
        send({ type: 'output', data: `\r\nCould not start ${options.command}: ${error instanceof Error ? error.message : String(error)}\r\n` })
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
      if (pty === undefined) start()
      else pty.resize(size.cols, size.rows)
    } else if (pty === undefined) {
      queuedInput.push(parsed.message.data)
      start()
    } else {
      pty.write(parsed.message.data)
    }
  })

  transport.onClose(() => {
    closed = true
    clearTimeout(fallback)
    pty?.kill()
  })
}
