import { parseCommandCatalog } from '../command-catalog'
import type { ServerMessage } from './server-message.contract'

export type ParsedServerMessage =
  | { ok: true, message: ServerMessage } |
  { ok: false, reason: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Accepts a text frame only when it is a well-formed {@link ServerMessage}, and says why otherwise. */
export function parseServerMessage (frame: string): ParsedServerMessage {
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
    case 'hello': {
      return typeof raw['version'] === 'number'
        ? { ok: true, message: { type: 'hello', version: raw['version'] } }
        : { ok: false, reason: 'hello needs a numeric version' }
    }
    case 'output': {
      return typeof raw['data'] === 'string'
        ? { ok: true, message: { type: 'output', data: raw['data'] } }
        : { ok: false, reason: 'output needs string data' }
    }
    case 'a11y-snapshot': {
      return isRecord(raw['snapshot']) && Array.isArray(raw['snapshot']['nodes'])
        ? { ok: true, message: { type: 'a11y-snapshot', snapshot: raw['snapshot'] as never } }
        : { ok: false, reason: 'a11y-snapshot needs a snapshot with nodes' }
    }
    case 'announce': {
      return typeof raw['text'] === 'string'
        ? {
            ok:      true,
            message: { type: 'announce', text: raw['text'], politeness: raw['politeness'] === 'assertive' ? 'assertive' : 'polite' },
          }
        : { ok: false, reason: 'announce needs text' }
    }
    case 'event': {
      return typeof raw['name'] === 'string'
        ? { ok: true, message: { type: 'event', name: raw['name'], payload: raw['payload'] } }
        : { ok: false, reason: 'event needs a name' }
    }
    case 'commands': {
      const commands = parseCommandCatalog(raw['commands'])

      return commands === undefined
        ? { ok: false, reason: 'commands needs a well-formed command list' }
        : { ok: true, message: { type: 'commands', commands } }
    }
    default: {
      return { ok: false, reason: `unknown message type "${raw['type']}"` }
    }
  }
}
