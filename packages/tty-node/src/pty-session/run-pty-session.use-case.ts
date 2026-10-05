import { parseServerMessage } from '@trectui/protocol'
import type { ServerMessage } from '@trectui/protocol'
import { APP_CHANNEL_ENV, createAppMessageExtractor } from '../osc-channel'
import { runSession } from '../session-lifecycle'
import type { Transport } from '../session-transport'
import { spawnWithNodePty } from './node-pty.client'
import type { PtySessionOptions } from './pty.contract'

/** What a served program may say to the page; its terminal output travels as `output`, never through this path. */
const APP_MESSAGE_TYPES = new Set<ServerMessage['type']>(['a11y-snapshot', 'announce', 'event'])

/**
 * Runs `options.command` in a PTY for one browser. The program starts at the
 * size the browser reports, so it sees the real terminal size from its first
 * line of output. Messages the program publishes through the application
 * channel are turned into protocol messages.
 */
export function runPtySession (transport: Transport, options: PtySessionOptions): void {
  const spawn = options.spawnPty ?? spawnWithNodePty

  runSession(transport, {
    startDelayMs: options.startDelayMs,
    async start (size, host) {
      const extractor = createAppMessageExtractor()
      let pty
      try {
        pty = await spawn(options.command, options.args ?? [], {
          ...size,
          cwd: options.cwd,
          env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', ...options.env, [APP_CHANNEL_ENV]: '1' },
        })
      } catch (error) {
        throw new Error(`Could not start ${options.command}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
      }

      pty.onData(data => {
        const { output, messages } = extractor.push(data)
        if (output !== '') host.send({ type: 'output', data: output })
        for (const raw of messages) {
          const parsed = parseServerMessage(raw)
          if (parsed.ok && APP_MESSAGE_TYPES.has(parsed.message.type)) host.send(parsed.message)
        }
      })
      pty.onExit(exitCode => {
        host.send({ type: 'event', name: 'exit', payload: { exitCode } })
        host.close()
      })

      return {
        write:   data => pty.write(data),
        resize:  (cols, rows) => pty.resize(cols, rows),
        dispose: () => pty.kill(),
      }
    },
  })
}
