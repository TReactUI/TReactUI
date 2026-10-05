import { parseServerMessage } from '@trectui/protocol'
import type { ServerMessage } from '@trectui/protocol'
import type { Transport } from '../session-transport'
import type { InkInstanceLike } from './ink-session.contract'
import { runInkSession } from './run-ink-session.use-case'

const noop = (): void => {}

function memoryTransport () {
  let onFrame: (frame: string) => void = noop
  let onClose: () => void = noop
  const transport: Transport & { sent: ServerMessage[], receive: (frame: string) => void, leave: () => void, closed: boolean } = {
    sent:   [],
    closed: false,
    send (frame) {
      const parsed = parseServerMessage(frame)
      if (parsed.ok) transport.sent.push(parsed.message)
    },
    onFrame (handler) { onFrame = handler },
    onClose (handler) { onClose = handler },
    close () { transport.closed = true },
    receive: frame => onFrame(frame),
    leave:   () => onClose(),
  }

  return transport
}

const flush = async (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

describe('runInkSession', () => {
  it('renders into terminal-like streams at the reported size and relays output, input and resizes', async () => {
    const transport = memoryTransport()
    const typed: string[] = []
    let sizeSeen = ''
    runInkSession(transport, {
      render ({ stdin, stdout }) {
        sizeSeen = `${stdout.columns}x${stdout.rows}`
        stdin.on('data', data => { typed.push(String(data)) })
        stdout.write('drawn')

        return { unmount: noop, waitUntilExit: async () => new Promise<void>(noop) }
      },
    })

    transport.receive('{"type":"resize","cols":100,"rows":30}')
    await flush()
    transport.receive('{"type":"input","data":"k"}')
    await flush()

    expect(sizeSeen).toBe('100x30')
    expect(typed).toEqual(['k'])
    expect(transport.sent).toContainEqual({ type: 'output', data: 'drawn' })
  })

  it('lets the app speak to the page directly', async () => {
    const transport = memoryTransport()
    runInkSession(transport, {
      render ({ announce, publishSnapshot, emitEvent }) {
        announce('Saved', 'assertive')
        publishSnapshot({ title: 'Form', nodes: [] })
        emitEvent('open-file', { accept: '.txt' })

        return { unmount: noop, waitUntilExit: async () => new Promise<void>(noop) }
      },
    })

    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()

    expect(transport.sent.slice(1)).toEqual([
      { type: 'announce', text: 'Saved', politeness: 'assertive' },
      { type: 'a11y-snapshot', snapshot: { title: 'Form', nodes: [] } },
      { type: 'event', name: 'open-file', payload: { accept: '.txt' } },
    ])
  })

  it('reports the exit and closes when the app finishes by itself', async () => {
    const transport = memoryTransport()
    runInkSession(transport, { render: () => ({ unmount: noop, waitUntilExit: async () => {} }) })

    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()
    await flush()

    expect(transport.sent.at(-1)).toEqual({ type: 'event', name: 'exit', payload: { exitCode: 0 } })
    expect(transport.closed).toBe(true)
  })

  it('unmounts the app when the browser leaves, without reporting an exit nobody can receive', async () => {
    const transport = memoryTransport()
    const unmount = jest.fn()
    let finish: () => void = noop
    const instance: InkInstanceLike = {
      unmount:       () => { unmount(); finish() },
      // eslint-disable-next-line unicorn/prefer-promise-with-resolvers -- the package's TypeScript lib (es2022) has no Promise.withResolvers
      waitUntilExit: async () => new Promise<void>(resolve => { finish = resolve }),
    }
    runInkSession(transport, { render: () => instance })
    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()

    transport.leave()
    await flush()

    expect(unmount).toHaveBeenCalledTimes(1)
    expect(transport.sent.some(message => message.type === 'event' && message.name === 'exit')).toBe(false)
  })

  it('shows an app that crashes and closes', async () => {
    const transport = memoryTransport()
    runInkSession(transport, { render: () => ({ unmount: noop, waitUntilExit: async () => { throw new Error('boom') } }) })

    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()
    await flush()

    expect(transport.sent).toContainEqual({ type: 'output', data: '\r\nboom\r\n' })
    expect(transport.sent.at(-1)).toEqual({ type: 'event', name: 'exit', payload: { exitCode: 1 } })
    expect(transport.closed).toBe(true)
  })
})
