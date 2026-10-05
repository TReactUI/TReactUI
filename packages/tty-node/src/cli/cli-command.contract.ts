import type { ServeCommandOptions } from '../serve-command'

/** What the command line asks for. */
export type CliCommand =
  | { kind: 'help' } |
  { kind: 'version' } |
  { kind: 'serve', options: ServeCommandOptions } |
  { kind: 'error', message: string }
