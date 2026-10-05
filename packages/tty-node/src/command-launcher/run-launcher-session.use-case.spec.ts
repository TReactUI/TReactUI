import { parseServerMessage } from '@trectui/protocol'
import type { CommandSpec, ServerMessage } from '@trectui/protocol'
import type { PtyLike, SpawnPtyOptions } from '../pty-session'
import type { Transport } from '../session-transport'
import { runLauncherSession } from './run-launcher-session.use-case'

const noop = (): void => {}

function memoryTransport () {
  let onFrame: (frame: string) => void = noop
  let onClose: () => void = noop
  const transport: Transport & { sent: ServerMessage[], receive: (frame: string) => void, leave: () => void } = {
    sent: [],
    send (frame) {
      const parsed = parseServerMessage(frame)
      if (parsed.ok) transport.sent.push(parsed.message)
    },
    onFrame (handler) { onFrame = handler },
    onClose (handler) { onClose = handler },
    close:   noop,
    receive: frame => onFrame(frame),
    leave:   () => onClose(),
  }

  return transport
}

function fakePty () {
  let onData: (data: string) => void = noop
  let onExit: (code: number) => void = noop
  const pty: PtyLike & { written: string[], resizes: Array<[number, number]>, killed: boolean, emit: (data: string) => void, exit: (code: number) => void } = {
    written: [],
    resizes: [],
    killed:  false,
    onData (handler) { onData = handler },
    onExit (handler) { onExit = handler },
    write (data) { pty.written.push(data) },
    resize (cols, rows) { pty.resizes.push([cols, rows]) },
    kill () {
      pty.killed = true
      onExit(137)
    },
    emit: data => onData(data),
    exit: code => onExit(code),
  }

  return pty
}

const commands: CommandSpec[] = [
  { name: 'greet', arguments: [{ name: 'name', required: true, variadic: false }], options: [] },
  { name: 'remote add', arguments: [], options: [] },
]
const flush = async (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

function launcher () {
  const transport = memoryTransport()
  const spawned: Array<{ command: string, args: string[], options: SpawnPtyOptions }> = []
  const ptys: Array<ReturnType<typeof fakePty>> = []
  runLauncherSession(transport, {
    commands,
    command: 'node',
    args:    ['cli.js'],
    spawnPty (command, args, options) {
      spawned.push({ command, args, options })
      const pty = fakePty()
      ptys.push(pty)

      return pty
    },
  })

  return { transport, spawned, ptys }
}

describe('runLauncherSession', () => {
  it('greets the browser with the catalog and runs nothing until asked', () => {
    const { transport, spawned } = launcher()

    expect(transport.sent).toEqual([{ type: 'hello', version: 1 }, { type: 'commands', commands }])
    expect(spawned).toEqual([])
  })

  it('runs the chosen command as an argument list appended to the base arguments, at the browser size', async () => {
    const { transport, spawned } = launcher()
    transport.receive('{"type":"resize","cols":100,"rows":30}')

    transport.receive('{"type":"run","command":"greet","args":["--shout","Ada; rm -rf /"]}')
    await flush()

    expect(spawned[0]).toMatchObject({ command: 'node', args: ['cli.js', 'greet', '--shout', 'Ada; rm -rf /'], options: { cols: 100, rows: 30 } })
  })

  it('splits a nested command name into separate arguments', async () => {
    const { transport, spawned } = launcher()

    transport.receive('{"type":"run","command":"remote add","args":["origin"]}')
    await flush()

    expect(spawned[0]?.args).toEqual(['cli.js', 'remote', 'add', 'origin'])
  })

  it('refuses a command that is not in the catalog', async () => {
    const { transport, spawned } = launcher()

    transport.receive('{"type":"run","command":"rm","args":[]}')
    await flush()

    expect(spawned).toEqual([])
    expect(transport.sent.at(-1)).toEqual({ type: 'announce', text: 'Unknown command "rm"', politeness: 'assertive' })
  })

  it('runs one command at a time, relays input and resizes to it, and lets the next start after it exits', async () => {
    const { transport, spawned, ptys } = launcher()
    transport.receive('{"type":"run","command":"greet","args":["a"]}')
    await flush()

    transport.receive('{"type":"run","command":"greet","args":["b"]}')
    await flush()
    transport.receive('{"type":"input","data":"x"}')
    transport.receive('{"type":"resize","cols":90,"rows":20}')
    ptys[0]?.exit(0)
    transport.receive('{"type":"run","command":"greet","args":["c"]}')
    await flush()

    expect(spawned.map(call => call.args.at(-1))).toEqual(['a', 'c'])
    expect(ptys[0]?.written).toEqual(['x'])
    expect(ptys[0]?.resizes).toEqual([[90, 20]])
    expect(transport.sent).toContainEqual({ type: 'event', name: 'exit', payload: { exitCode: 0 } })
  })

  it('stops the running command on request, which reports its exit', async () => {
    const { transport, ptys } = launcher()
    transport.receive('{"type":"run","command":"greet","args":["a"]}')
    await flush()

    transport.receive('{"type":"stop"}')

    expect(ptys[0]?.killed).toBe(true)
    expect(transport.sent.at(-1)).toEqual({ type: 'event', name: 'exit', payload: { exitCode: 137 } })
  })

  it('stops the running command when the browser leaves', async () => {
    const { transport, ptys } = launcher()
    transport.receive('{"type":"run","command":"greet","args":["a"]}')
    await flush()

    transport.leave()

    expect(ptys[0]?.killed).toBe(true)
  })

  it('reports a command that cannot start and stays usable', async () => {
    const transport = memoryTransport()
    runLauncherSession(transport, { commands, command: 'missing', spawnPty: () => { throw new Error('ENOENT') } })

    transport.receive('{"type":"run","command":"greet","args":["a"]}')
    await flush()

    expect(transport.sent.at(-2)).toMatchObject({ type: 'output', data: expect.stringContaining('Could not start missing: ENOENT') })
    expect(transport.sent.at(-1)).toEqual({ type: 'event', name: 'exit', payload: { exitCode: 1 } })
  })
})
