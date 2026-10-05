import type { CommandSpec } from '@treactui/protocol'
import type { PtySessionOptions } from '../pty-session'

export interface LauncherOptions extends Omit<PtySessionOptions, 'startDelayMs'> {
  /** What the browser may run. A `run` message is refused unless it names one of these. */
  commands: CommandSpec[]
  // `command`, `args`, `cwd`, `env` and `spawnPty` (from PtySessionOptions): the program to run. The chosen
  // command's name and arguments are appended to `args`, so `command: 'node', args: ['cli.js']` runs
  // `node cli.js <command> <arguments>`.
}
