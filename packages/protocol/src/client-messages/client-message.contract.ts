/** Browser to backend. */
export type ClientMessage =
  | { type: 'input', data: string } |
  { type: 'resize', cols: number, rows: number }
