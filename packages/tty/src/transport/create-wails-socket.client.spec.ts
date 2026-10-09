import { openTtyConnection } from './open-tty-connection.client'
import { createWailsSocket } from './create-wails-socket.client'
import type { EventsRuntime } from './wails-socket.contract'

interface FakeRuntime extends EventsRuntime {
  /** The "up" messages Go would receive, decoded. */
  up:     Array<{ c: string, n: number, t: string, f?: string }>
  /** Plays Go: emits a "down" event to the page. */
  down:   (message: Record<string, unknown> | string) => void
  active: () => number
}

function fakeRuntime (): FakeRuntime {
  const handlers = new Map<string, Array<(...data: unknown[]) => void>>()
  const up: FakeRuntime['up'] = []

  return {
    up,
    EventsOn (name, callback) {
      handlers.set(name, [...(handlers.get(name) ?? []), callback])

      return () => {
        handlers.set(name, (handlers.get(name) ?? []).filter(handler => handler !== callback))
      }
    },
    EventsEmit (name, ...data) {
      if (name === 'treactui:up') up.push(JSON.parse(String(data[0])))
    },
    down (message) {
      const data = typeof message === 'string' ? message : JSON.stringify(message)
      const listening = handlers.get('treactui:down') ?? []
      for (const handler of listening) handler(data)
    },
    active: () => (handlers.get('treactui:down') ?? []).length,
  }
}

const flush = async (): Promise<void> => { await Promise.resolve() }

describe('createWailsSocket', () => {
  it('opens a connection with a numbered open event and flushes what was sent before, in order', async () => {
    const runtime = fakeRuntime()
    const onOpen = jest.fn()
    const connection = openTtyConnection({
      url:          '',
      onMessage:    jest.fn(),
      onOpen,
      createSocket: createWailsSocket({ runtime }),
    })
    connection.send({ type: 'resize', cols: 80, rows: 24 })
    expect(runtime.up).toEqual([])

    await flush()

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(runtime.up.map(message => [message.n, message.t])).toEqual([[0, 'open'], [1, 'frame']])
    expect(JSON.parse(runtime.up[1].f ?? '').type).toBe('resize')
    expect(new Set(runtime.up.map(message => message.c)).size).toBe(1)
  })

  it('delivers the messages from Go in order, even when they arrive out of order', async () => {
    const runtime = fakeRuntime()
    const onMessage = jest.fn()
    openTtyConnection({ url: '', onMessage, createSocket: createWailsSocket({ runtime }) })
    await flush()
    const c = runtime.up[0].c

    runtime.down({ c, n: 2, t: 'frame', f: '{"type":"output","data":"c"}' })
    runtime.down({ c, n: 0, t: 'frame', f: '{"type":"hello","version":1}' })
    runtime.down({ c, n: 1, t: 'frame', f: '{"type":"output","data":"b"}' })

    expect(onMessage.mock.calls.map(([message]) => message.type === 'output' ? message.data : message.type)).toEqual(['hello', 'b', 'c'])
  })

  it('ignores events of another connection and ones that are not messages', async () => {
    const runtime = fakeRuntime()
    const onMessage = jest.fn()
    openTtyConnection({ url: '', onMessage, createSocket: createWailsSocket({ runtime }) })
    await flush()

    runtime.down({ c: 'someone-else', n: 0, t: 'frame', f: '{"type":"output","data":"x"}' })
    runtime.down('not json')
    runtime.down({ n: 0 })

    expect(onMessage).not.toHaveBeenCalled()
  })

  it('closes when Go says the program ended, and stops listening', async () => {
    const runtime = fakeRuntime()
    const onClose = jest.fn()
    const connection = openTtyConnection({ url: '', onMessage: jest.fn(), onClose, createSocket: createWailsSocket({ runtime }) })
    await flush()

    runtime.down({ c: runtime.up[0].c, n: 0, t: 'close' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(runtime.active()).toBe(0)
    connection.send({ type: 'input', data: 'a' })
    expect(runtime.up).toHaveLength(1)
  })

  it('tells Go when the page closes the connection', async () => {
    const runtime = fakeRuntime()
    const onClose = jest.fn()
    const connection = openTtyConnection({ url: '', onMessage: jest.fn(), onClose, createSocket: createWailsSocket({ runtime }) })
    await flush()

    connection.close()
    connection.close()

    expect(runtime.up.map(message => message.t)).toEqual(['open', 'close'])
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(runtime.active()).toBe(0)
  })

  it('does not open a connection that was closed before it opened', async () => {
    const runtime = fakeRuntime()
    const connection = openTtyConnection({ url: '', onMessage: jest.fn(), createSocket: createWailsSocket({ runtime }) })

    connection.close()
    await flush()

    expect(runtime.up.map(message => message.t)).toEqual(['close'])
  })

  it('uses window.runtime by default, and says so when there is none', () => {
    expect(() => createWailsSocket()()).toThrow('Wails runtime')

    const runtime = fakeRuntime()
    Reflect.set(globalThis, 'runtime', runtime)
    try {
      expect(() => createWailsSocket()()).not.toThrow()
      expect(runtime.active()).toBe(1)
    } finally {
      Reflect.deleteProperty(globalThis, 'runtime')
    }
  })
})
