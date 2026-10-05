import { runSession } from '../session-lifecycle'
import type { Transport } from '../session-transport'
import type { PtySessionOptions } from './pty.contract'
import { startPtyProgram } from './start-pty-program.use-case'

/**
 * Runs `options.command` in a PTY for one browser. The program starts at the
 * size the browser reports, so it sees the real terminal size from its first
 * line of output. Messages the program publishes through the application
 * channel are turned into protocol messages.
 */
export function runPtySession (transport: Transport, options: PtySessionOptions): void {
  runSession(transport, {
    startDelayMs: options.startDelayMs,
    start:        async (size, host) => startPtyProgram(options, size, host),
  })
}
