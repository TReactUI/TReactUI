import type { PtyLike, SpawnPty } from './pty.contract'

/** Starts a program under node-pty. The native module is loaded on first use, so importing the package stays cheap. */
export const spawnWithNodePty: SpawnPty = async (command, args, options): Promise<PtyLike> => {
  const pty = await import('node-pty')
  const env = Object.fromEntries(Object.entries(options.env).filter((entry): entry is [string, string] => entry[1] !== undefined))
  const process = pty.spawn(command, args, { name: 'xterm-256color', cols: options.cols, rows: options.rows, cwd: options.cwd, env })

  return {
    onData: handler => process.onData(handler),
    onExit: handler => process.onExit(({ exitCode }) => handler(exitCode)),
    write:  data => process.write(data),
    resize: (cols, rows) => process.resize(cols, rows),
    kill:   () => process.kill(),
  }
}
