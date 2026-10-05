import type { A11ySnapshot } from './a11y-snapshot.contract'

/** How urgently a screen reader should interrupt to read an announcement. */
export type Politeness = 'polite' | 'assertive'

/** Backend to browser. */
export type ServerMessage =
  | { type: 'hello', version: number } |
  { type: 'output', data: string } |
  { type: 'a11y-snapshot', snapshot: A11ySnapshot } |
  { type: 'announce', text: string, politeness: Politeness } |
  { type: 'event', name: string, payload?: unknown }
