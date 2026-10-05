import { existsSync } from 'node:fs'
import { findExecutable } from './find-executable.algorithm'
import type { PtyLike, SpawnPty } from './pty.contract'

/** Starts a program under node-pty. The native module is loaded on first use, so importing the package stays cheap. */
export const spawnWithNodePty: SpawnPty = async (command, args, options): Promise<PtyLike> => {
  const pty = await import('node-pty')
  const env = Object.fromEntries(Object.entries(options.env).filter((entry): entry is [string, string] => entry[1] !== undefined))
  const file = findExecutable(command, { platform: process.platform, env: options.env, exists: existsSync })
  const child = pty.spawn(file, args, { name: 'xterm-256color', cols: options.cols, rows: options.rows, cwd: options.cwd, env })

  return {
    onData: handler => child.onData(handler),
    onExit: handler => child.onExit(({ exitCode }) => handler(exitCode)),
    write:  data => child.write(data),
    resize: (cols, rows) => child.resize(cols, rows),
    kill:   () => child.kill(),
  }
}
