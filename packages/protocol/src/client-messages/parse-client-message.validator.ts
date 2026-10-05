import type { ClientMessage } from './client-message.contract'

export type ParsedClientMessage =
  | { ok: true, message: ClientMessage } |
  { ok: false, reason: string }

/** A terminal larger than this is a mistake or an attack, not a screen. */
const MAX_CELLS = 1000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isCellCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= MAX_CELLS

/** Accepts a text frame only when it is a well-formed {@link ClientMessage}, and says why otherwise. */
export function parseClientMessage (frame: string): ParsedClientMessage {
  let raw: unknown
  try {
    raw = JSON.parse(frame)
  } catch {
    return { ok: false, reason: 'frame is not valid JSON' }
  }
  if (!isRecord(raw) || typeof raw['type'] !== 'string') {
    return { ok: false, reason: 'frame has no message type' }
  }

  switch (raw['type']) {
    case 'input': {
      return typeof raw['data'] === 'string'
        ? { ok: true, message: { type: 'input', data: raw['data'] } }
        : { ok: false, reason: 'input needs string data' }
    }
    case 'resize': {
      return isCellCount(raw['cols']) && isCellCount(raw['rows'])
        ? { ok: true, message: { type: 'resize', cols: raw['cols'], rows: raw['rows'] } }
        : { ok: false, reason: `resize needs whole cols and rows between 1 and ${MAX_CELLS}` }
    }
    default: {
      return { ok: false, reason: `unknown message type "${raw['type']}"` }
    }
  }
}
