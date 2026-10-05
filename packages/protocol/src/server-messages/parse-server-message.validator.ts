import { parseCommandCatalog } from '../command-catalog'
import type { ServerMessage } from './server-message.contract'

export type ParsedServerMessage =
  | { ok: true, message: ServerMessage } |
  { ok: false, reason: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A node needs a role; its children, if any, must be nodes too. Unknown roles are let through and rendered as given. */
const isNode = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value['role'] === 'string' &&
  (value['children'] === undefined || (Array.isArray(value['children']) && value['children'].every(child => isNode(child))))

const isSnapshot = (value: unknown): boolean =>
  isRecord(value) && typeof value['title'] === 'string' && Array.isArray(value['nodes']) && value['nodes'].every(node => isNode(node))

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
      return isSnapshot(raw['snapshot'])
        ? { ok: true, message: { type: 'a11y-snapshot', snapshot: raw['snapshot'] as never } }
        : { ok: false, reason: 'a11y-snapshot needs a snapshot with a title and nodes that have roles' }
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
