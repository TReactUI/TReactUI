import type { ServerMessage } from '@treactui/protocol'
import type { SessionHost } from '../session-lifecycle'
import { startPtyProgram } from './start-pty-program.use-case'
import type { PtyLike } from './pty.contract'

const noop = (): void => {}

/** A pseudo-terminal that records pause and resume, and lets the test produce output and an exit. */
function fakePty (withFlowControl = true) {
  let onData: (data: string) => void = noop
  let onExit: (code: number) => void = noop
  const calls: string[] = []
  const pty: PtyLike & { calls: string[], emit: (data: string) => void, exit: (code: number) => void } = {
    calls,
    onData: handler => { onData = handler },
    onExit: handler => { onExit = handler },
    write:  noop,
    resize: noop,
    kill:   noop,
    emit:   data => { onData(data) },
    exit:   code => { onExit(code) },
  }
  if (withFlowControl) {
    pty.pause = () => { calls.push('pause') }
    pty.resume = () => { calls.push('resume') }
  }

  return pty
}

/** A browser connection that is behind when the test says so. */
function fakeHost () {
  const sent: ServerMessage[] = []
  const drainHandlers = new Set<() => void>()
  const state = { backedUp: false }
  const host: SessionHost = {
    send:       message => { sent.push(message) },
    close:      noop,
    isBackedUp: () => state.backedUp,
    onDrain:    handler => {
      drainHandlers.add(handler)

      return () => { drainHandlers.delete(handler) }
    },
  }

  return {
    host,
    sent,
    handlers:   drainHandlers,
    fallBehind: () => { state.backedUp = true },
    catchUp:    () => {
      state.backedUp = false
      for (const handler of drainHandlers) handler()
    },
  }
}

async function start (pty: PtyLike, host: SessionHost) {
  return startPtyProgram({ command: 'program', spawnPty: () => pty }, { cols: 80, rows: 24 }, host)
}

describe('startPtyProgram flow control', () => {
  it('lets the program run while the browser keeps up', async () => {
    const pty = fakePty()
    const { host, sent } = fakeHost()
    await start(pty, host)

    pty.emit('one')
    pty.emit('two')

    expect(sent).toEqual([{ type: 'output', data: 'one' }, { type: 'output', data: 'two' }])
    expect(pty.calls).toEqual([])
  })

  it('stops reading the program, once, as soon as the browser falls behind, and still sends that output', async () => {
    const pty = fakePty()
    const { host, sent, fallBehind } = fakeHost()
    await start(pty, host)

    fallBehind()
    pty.emit('the chunk that tipped it over')
    pty.emit('already in flight')

    expect(sent).toEqual([{ type: 'output', data: 'the chunk that tipped it over' }, { type: 'output', data: 'already in flight' }])
    expect(pty.calls).toEqual(['pause'])
  })

  it('reads the program again when the browser has caught up, and can pause a second time', async () => {
    const pty = fakePty()
    const { host, fallBehind, catchUp } = fakeHost()
    await start(pty, host)

    fallBehind()
    pty.emit('a')
    catchUp()
    pty.emit('b')
    fallBehind()
    pty.emit('c')
    catchUp()

    expect(pty.calls).toEqual(['pause', 'resume', 'pause', 'resume'])
  })

  it('does not resume a program that was never paused', async () => {
    const pty = fakePty()
    const { host, catchUp } = fakeHost()
    await start(pty, host)

    catchUp()

    expect(pty.calls).toEqual([])
  })

  it('stops listening for the browser to catch up once the program has exited', async () => {
    const pty = fakePty()
    const { host, handlers } = fakeHost()
    await start(pty, host)
    expect(handlers.size).toBe(1)

    pty.exit(0)

    expect(handlers.size).toBe(0)
  })

  it('works with a pseudo-terminal that cannot be paused', async () => {
    const pty = fakePty(false)
    const { host, sent, fallBehind, catchUp } = fakeHost()
    await start(pty, host)

    fallBehind()
    pty.emit('still delivered')
    catchUp()

    expect(sent).toEqual([{ type: 'output', data: 'still delivered' }])
  })
})
