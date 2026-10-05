import { lstatSync } from 'node:fs'
import { findExecutable } from './find-executable.algorithm'
import type { PtyLike, SpawnPty } from './pty.contract'

/**
 * Whether a program file is there. `lstat`, not `stat` or `existsSync`: the Microsoft Store's
 * `python.exe` (and the other app execution aliases) is a reparse point that cannot be
 * stat-ed or opened, yet launches fine, and Windows ships Python that way.
 */
const isProgramFile = (filePath: string): boolean => {
  try {
    return !lstatSync(filePath).isDirectory()
  } catch {
    return false
  }
}

/** Starts a program under node-pty. The native module is loaded on first use, so importing the package stays cheap. */
export const spawnWithNodePty: SpawnPty = async (command, args, options): Promise<PtyLike> => {
  const pty = await import('node-pty')
  const env = Object.fromEntries(Object.entries(options.env).filter((entry): entry is [string, string] => entry[1] !== undefined))
  const file = findExecutable(command, { platform: process.platform, env: options.env, exists: isProgramFile })
  const child = pty.spawn(file, args, { name: 'xterm-256color', cols: options.cols, rows: options.rows, cwd: options.cwd, env })

  return {
    onData: handler => child.onData(handler),
    onExit: handler => child.onExit(({ exitCode }) => handler(exitCode)),
    write:  data => child.write(data),
    resize: (cols, rows) => child.resize(cols, rows),
    kill:   () => child.kill(),
  }
}
