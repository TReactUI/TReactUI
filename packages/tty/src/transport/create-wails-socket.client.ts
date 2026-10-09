import type { SocketLike } from './tty-connection.contract'
import { createSequencer } from './sequence.algorithm'
import type { EventsRuntime, WailsSocketOptions } from './wails-socket.contract'

type Listener = (event: { data?: unknown }) => void
type ListenerType = 'open' | 'close' | 'message'

/** What a "down" event holds: one message from Go, numbered per connection. */
interface DownMessage {
  c:  string
  n:  number
  t:  'frame' | 'close'
  f?: string
}

/**
 * A socket-like connection over Wails' events, for `<TTY createSocket={...} />`: the page and the Go
 * program talk through the desktop shell, with no server, port or WebSocket. Go serves it with
 * `ttygo.Bind` or `ttygo.BindShared`.
 *
 * Create it once, outside the component: a new function on every render would make the terminal
 * reconnect every time.
 *
 * @example
 * const wailsSocket = createWailsSocket()
 * <TTY createSocket={wailsSocket} />
 */
export function createWailsSocket (options: WailsSocketOptions = {}): (url?: string) => SocketLike {
  const prefix = options.prefix ?? 'treactui'

  return () => {
    const runtime = options.runtime ?? windowRuntime()
    const connection = newConnectionId()
    const listeners: Record<ListenerType, Listener[]> = { open: [], close: [], message: [] }
    const incoming = createSequencer<DownMessage>()
    let outgoing = 0
    let ended = false

    // Events reach Go in separate goroutines, so each carries the connection's id and a number.
    const emit = (kind: 'open' | 'frame' | 'close', frame?: string): void => {
      const message = { c: connection, n: outgoing, t: kind, f: frame }
      outgoing += 1
      runtime.EventsEmit(`${prefix}:up`, JSON.stringify(message))
    }
    const dispatch = (type: ListenerType, data?: unknown): void => {
      const forType = listeners[type]
      for (const listener of forType) listener({ data })
    }

    const stopListening = runtime.EventsOn(`${prefix}:down`, (...data) => {
      const message = parseDown(data[0])
      if (message === undefined || message.c !== connection) return
      for (const ready of incoming.push(message.n, message)) {
        if (ready.t === 'close') {
          finish()
        } else if (!ended && ready.f !== undefined) {
          dispatch('message', ready.f)
        }
      }
    })

    function finish (): void {
      if (ended) return
      ended = true
      stopListening()
      dispatch('close')
    }

    // The listeners are added right after this returns, so the connection opens a moment later.
    queueMicrotask(() => {
      if (ended) return
      emit('open')
      dispatch('open')
    })

    return {
      send (frame) {
        if (!ended) emit('frame', frame)
      },
      close () {
        if (ended) return
        emit('close')
        finish()
      },
      addEventListener (type, listener) {
        listeners[type].push(listener)
      },
    }
  }
}

function windowRuntime (): EventsRuntime {
  const runtime = (globalThis as { runtime?: Partial<EventsRuntime> }).runtime
  if (typeof runtime?.EventsOn !== 'function' || typeof runtime.EventsEmit !== 'function') {
    throw new TypeError('createWailsSocket needs the Wails runtime (window.runtime), which only a page served by Wails has')
  }

  return runtime as EventsRuntime
}

function newConnectionId (): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function parseDown (data: unknown): DownMessage | undefined {
  if (typeof data !== 'string') return undefined
  try {
    const message: unknown = JSON.parse(data)
    if (typeof message !== 'object' || message === null) return undefined
    const { c, n, t, f } = message as Record<string, unknown>
    if (typeof c !== 'string' || typeof n !== 'number' || (t !== 'frame' && t !== 'close')) return undefined

    return { c, n, t, f: typeof f === 'string' ? f : undefined }
  } catch {
    return undefined
  }
}
