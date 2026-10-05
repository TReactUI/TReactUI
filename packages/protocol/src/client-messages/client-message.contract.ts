/** Browser to backend. */
export type ClientMessage =
  | { type: 'input', data: string } |
  { type: 'resize', cols: number, rows: number } |
  /** Runs one of the commands the backend offered (a `commands` message), with these arguments. */
  { type: 'run', command: string, args: string[] } |
  /** Stops the running command. */
  { type: 'stop' }
