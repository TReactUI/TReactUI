import { parseServerMessage } from '@trectui/protocol'
import type { ServerMessage } from '@trectui/protocol'
import type { Transport } from '../session-transport'
import { runPtySession } from './run-pty-session.use-case'
import type { PtyLike, SpawnPtyOptions } from './pty.contract'

const noop = (): void => {}

function memoryTransport (): Transport & { sent: ServerMessage[], receive: (frame: string) => void, closeFromBrowser: () => void, closed: boolean } {
  let onFrame: (frame: string) => void = noop
  let onClose: () => void = noop
  const transport = {
    sent:   [] as ServerMessage[],
    closed: false,
    send (frame: string) {
      const parsed = parseServerMessage(frame)
      if (parsed.ok) transport.sent.push(parsed.message)
    },
    onFrame (handler: (frame: string) => void) { onFrame = handler },
    onClose (handler: () => void) { onClose = handler },
    close () { transport.closed = true },
    receive:          (frame: string) => onFrame(frame),
    closeFromBrowser: () => onClose(),
  }

  return transport
}

function fakePty (): PtyLike & { written: string[], resizes: Array<[number, number]>, killed: boolean, emit: (data: string) => void, exit: (code: number) => void } {
  let onData: (data: string) => void = noop
  let onExit: (code: number) => void = noop
  const pty = {
    written: [] as string[],
    resizes: [] as Array<[number, number]>,
    killed:  false,
    onData (handler: (data: string) => void) { onData = handler },
    onExit (handler: (code: number) => void) { onExit = handler },
    write (data: string) { pty.written.push(data) },
    resize (cols: number, rows: number) { pty.resizes.push([cols, rows]) },
    kill () { pty.killed = true },
    emit:    (data: string) => onData(data),
    exit:    (code: number) => onExit(code),
  }

  return pty
}

const flush = async (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

describe('runPtySession', () => {
  it('starts the program at the size the browser reports, and relays output, input and resizes', async () => {
    const transport = memoryTransport()
    const pty = fakePty()
    const spawned: SpawnPtyOptions[] = []
    runPtySession(transport, {
      command:  'tool',
      args:     ['--x'],
      spawnPty: (_c, _a, options) => {
        spawned.push(options)

        return pty
      },
    })

    transport.receive('{"type":"resize","cols":100,"rows":30}')
    await flush()
    transport.receive('{"type":"input","data":"a"}')
    pty.emit('hello')
    transport.receive('{"type":"resize","cols":120,"rows":40}')

    expect(spawned[0]).toMatchObject({ cols: 100, rows: 30, env: { TREACT_TTY: '1' } })
    expect(pty.written).toEqual(['a'])
    expect(pty.resizes).toEqual([[120, 40]])
    expect(transport.sent).toEqual([
      { type: 'hello', version: 1 },
      { type: 'output', data: 'hello' },
    ])
  })

  it('turns messages the program publishes into protocol messages and strips them from the output', async () => {
    const transport = memoryTransport()
    const pty = fakePty()
    runPtySession(transport, { command: 'tool', spawnPty: () => pty })
    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()

    pty.emit('a\u{1B}]7770;{"type":"announce","text":"Done","politeness":"polite"}\u{7}b')
    pty.emit('\u{1B}]7770;{"type":"output","data":"spoofed"}\u{7}')

    expect(transport.sent.slice(1)).toEqual([
      { type: 'output', data: 'ab' },
      { type: 'announce', text: 'Done', politeness: 'polite' },
    ])
  })

  it('holds input typed before the program exists, and reports the exit before closing', async () => {
    const transport = memoryTransport()
    const pty = fakePty()
    runPtySession(transport, { command: 'tool', spawnPty: () => pty })

    transport.receive('{"type":"input","data":"early"}')
    await flush()
    pty.exit(3)

    expect(pty.written).toEqual(['early'])
    expect(transport.sent.at(-1)).toEqual({ type: 'event', name: 'exit', payload: { exitCode: 3 } })
    expect(transport.closed).toBe(true)
  })

  it('kills the program when the browser leaves, even if it was still starting', async () => {
    const transport = memoryTransport()
    const pty = fakePty()
    runPtySession(transport, { command: 'tool', spawnPty: () => pty })
    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()

    transport.closeFromBrowser()

    expect(pty.killed).toBe(true)
  })

  it('tells the browser when the program cannot start', async () => {
    const transport = memoryTransport()
    runPtySession(transport, { command: 'missing', spawnPty: () => { throw new Error('ENOENT') } })

    transport.receive('{"type":"resize","cols":80,"rows":24}')
    await flush()

    expect(transport.sent.at(-1)).toMatchObject({ type: 'output', data: expect.stringContaining('Could not start missing: ENOENT') })
    expect(transport.closed).toBe(true)
  })
})
