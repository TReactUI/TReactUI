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

/** The limits on a `run` message: it becomes a process command line, so it is bounded and free of NUL. */
const MAX_COMMAND_LENGTH = 200
const MAX_ARGS = 100
const MAX_ARG_LENGTH = 10_000
const NUL = String.fromCodePoint(0)

const isCommandLinePart = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.length <= maxLength && !value.includes(NUL)

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
    case 'run': {
      const args = raw['args']
      const valid = isCommandLinePart(raw['command'], MAX_COMMAND_LENGTH) && raw['command'] !== '' &&
        Array.isArray(args) && args.length <= MAX_ARGS && args.every(arg => isCommandLinePart(arg, MAX_ARG_LENGTH))

      return valid
        ? { ok: true, message: { type: 'run', command: raw['command'] as string, args: args } }
        : { ok: false, reason: `run needs a command and up to ${MAX_ARGS} string arguments without NUL` }
    }
    case 'stop': {
      return { ok: true, message: { type: 'stop' } }
    }
    default: {
      return { ok: false, reason: `unknown message type "${raw['type']}"` }
    }
  }
}
