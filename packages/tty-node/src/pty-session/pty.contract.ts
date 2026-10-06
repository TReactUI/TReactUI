/** The part of a pseudo-terminal the session uses; lets tests supply a fake. */
export interface PtyLike {
  onData:  (handler: (data: string) => void) => void
  onExit:  (handler: (exitCode: number) => void) => void
  write:   (data: string) => void
  resize:  (cols: number, rows: number) => void
  kill:    () => void
  /** Stops reading the program's output, so that it blocks when the pipe is full. Optional: a fake need not. */
  pause?:  () => void
  resume?: () => void
}

export interface SpawnPtyOptions {
  cols: number
  rows: number
  cwd?: string
  env:  NodeJS.ProcessEnv
}

export type SpawnPty = (command: string, args: string[], options: SpawnPtyOptions) => PtyLike | Promise<PtyLike>

export interface PtySessionOptions {
  command:       string
  args?:         string[]
  cwd?:          string
  /** Added to the program's environment. */
  env?:          NodeJS.ProcessEnv
  /** Defaults to node-pty, loaded on first use. */
  spawnPty?:     SpawnPty
  /** Used when the browser has not reported a size within this many milliseconds. Default 500. */
  startDelayMs?: number
}
