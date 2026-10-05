import { parseServerMessage } from '@trectui/protocol'
import type { ServerMessage } from '@trectui/protocol'
import type { Transport } from '../session-transport'
import { runSession } from './run-session.use-case'
import type { SessionController } from './session.contract'

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

function controller (): SessionController & { written: string[], resizes: Array<[number, number]>, disposed: boolean } {
  const fake = {
    written:  [] as string[],
    resizes:  [] as Array<[number, number]>,
    disposed: false,
    write (data: string) { fake.written.push(data) },
    resize (cols: number, rows: number) { fake.resizes.push([cols, rows]) },
    dispose () { fake.disposed = true },
  }

  return fake
}

const flush = async (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

describe('runSession', () => {
  it('greets the browser, then starts the program at the size it reports', async () => {
    const transport = memoryTransport()
    const running = controller()
    const start = jest.fn(() => running)
    runSession(transport, { start })

    transport.receive('{"type":"resize","cols":100,"rows":30}')
    await flush()

    expect(transport.sent).toEqual([{ type: 'hello', version: 1 }])
    expect(start).toHaveBeenCalledWith({ cols: 100, rows: 30 }, expect.anything())
  })

  it('starts at 80x24 when the browser never reports a size', async () => {
    const start = jest.fn(() => controller())
    runSession(memoryTransport(), { start, startDelayMs: 10 })

    await new Promise(resolve => setTimeout(resolve, 40))

    expect(start).toHaveBeenCalledWith({ cols: 80, rows: 24 }, expect.anything())
  })

  it('holds input typed before the program exists, then relays input and resizes', async () => {
    const transport = memoryTransport()
    const running = controller()
    runSession(transport, { start: () => running })

    transport.receive('{"type":"input","data":"early"}')
    await flush()
    transport.receive('{"type":"input","data":"late"}')
    transport.receive('{"type":"resize","cols":120,"rows":40}')

    expect(running.written).toEqual(['early', 'late'])
    expect(running.resizes).toEqual([[120, 40]])
  })

  it('stops the program when the browser leaves, even while it is still starting', async () => {
    const transport = memoryTransport()
    const running = controller()
    let finishStarting: (value: SessionController) => void = noop
    // eslint-disable-next-line unicorn/prefer-promise-with-resolvers -- the package's TypeScript lib (es2022) has no Promise.withResolvers
    runSession(transport, { start: async () => new Promise<SessionController>(resolve => { finishStarting = resolve }) })
    transport.receive('{"type":"resize","cols":80,"rows":24}')
    transport.leave()

    finishStarting(running)
    await flush()

    expect(running.disposed).toBe(true)
  })

  it('shows why the program could not start and closes', async () => {
    const transport = memoryTransport()
    runSession(transport, { start: () => { throw new Error('no such program') } })

    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()

    expect(transport.sent.at(-1)).toEqual({ type: 'output', data: '\r\nno such program\r\n' })
    expect(transport.closed).toBe(true)
  })

  it('ignores frames that are not valid client messages', async () => {
    const transport = memoryTransport()
    const running = controller()
    runSession(transport, { start: () => running })
    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()

    transport.receive('garbage')
    transport.receive('{"type":"resize","cols":0,"rows":0}')

    expect(running.written).toEqual([])
    expect(running.resizes).toEqual([])
  })
})
