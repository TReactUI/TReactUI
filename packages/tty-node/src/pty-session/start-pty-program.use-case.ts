import { parseServerMessage } from '@treactui/protocol'
import type { ServerMessage } from '@treactui/protocol'
import { APP_CHANNEL_ENV, createAppMessageExtractor } from '../osc-channel'
import type { SessionController, SessionHost, TerminalSize } from '../session-lifecycle'
import { spawnWithNodePty } from './node-pty.client'
import type { PtySessionOptions } from './pty.contract'

/** What a served program may say to the page; its terminal output travels as `output`, never through this path. */
const APP_MESSAGE_TYPES = new Set<ServerMessage['type']>(['a11y-snapshot', 'announce', 'event'])

/**
 * Starts the program in a PTY and wires it to `host`: its output (minus the
 * application channel) becomes `output` messages, what it publishes through the
 * channel becomes protocol messages, and its exit is reported and ends the host.
 * Throws if it cannot start.
 */
export async function startPtyProgram (options: PtySessionOptions, size: TerminalSize, host: SessionHost): Promise<SessionController> {
  const spawn = options.spawnPty ?? spawnWithNodePty
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

  // When the browser falls behind, stop reading the program: its writes then block, as they would on a slow
  // terminal, instead of piling up in this process without limit. Nothing is dropped.
  let paused = false
  const stopWatchingDrain = host.onDrain(() => {
    if (!paused) return
    paused = false
    pty.resume?.()
  })

  pty.onData(data => {
    const { output, messages } = extractor.push(data)
    if (output !== '') host.send({ type: 'output', data: output })
    for (const raw of messages) {
      const parsed = parseServerMessage(raw)
      if (parsed.ok && APP_MESSAGE_TYPES.has(parsed.message.type)) host.send(parsed.message)
    }
    if (!paused && host.isBackedUp()) {
      paused = true
      pty.pause?.()
    }
  })
  pty.onExit(exitCode => {
    stopWatchingDrain()
    host.send({ type: 'event', name: 'exit', payload: { exitCode } })
    host.close()
  })

  return {
    write:   data => pty.write(data),
    resize:  (cols, rows) => pty.resize(cols, rows),
    dispose: () => pty.kill(),
  }
}
