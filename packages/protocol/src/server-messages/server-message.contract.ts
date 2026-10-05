import type { A11ySnapshot } from '../a11y-snapshot'
import type { CommandSpec } from '../command-catalog'

/** How urgently a screen reader should interrupt to read an announcement. */
export type Politeness = 'polite' | 'assertive'

/** Backend to browser. */
export type ServerMessage =
  | { type: 'hello', version: number } |
  { type: 'output', data: string } |
  { type: 'a11y-snapshot', snapshot: A11ySnapshot } |
  { type: 'announce', text: string, politeness: Politeness } |
  { type: 'event', name: string, payload?: unknown } |
  /** The commands the browser may run; it then offers a launcher and starts one with a `run` message. */
  { type: 'commands', commands: CommandSpec[] }
