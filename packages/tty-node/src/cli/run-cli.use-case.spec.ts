import { WebSocket } from 'ws'
import type { PtyLike } from '../pty-session'
import { serveCommand } from '../serve-command'
import { runCli } from './run-cli.use-case'
import type { CliEnvironment } from './run-cli.use-case'

function environment (overrides: Partial<CliEnvironment> = {}) {
  const out: string[] = []
  const err: string[] = []
  const env: CliEnvironment = {
    version:     '1.2.3',
    write:       text => { out.push(text) },
    writeError:  text => { err.push(text) },
    waitForStop: async () => undefined,
    ...overrides,
  }

  return { env, out: () => out.join(''), err: () => err.join('') }
}

const fakeServer = async (port = 1) => ({ port, close: async () => undefined })

/** Resolves once `condition` holds, polling; the test's own timeout bounds the wait. */
async function until (condition: () => boolean): Promise<void> {
  while (!condition()) {
    await new Promise(resolve => { setTimeout(resolve, 10) })
  }
}

describe('runCli', () => {
  it('prints the help and exits 0', async () => {
    const { env, out } = environment()

    expect(await runCli(['--help'], env)).toBe(0)
    expect(out()).toContain('treactui serve [options] -- <program>')
  })

  it('prints the version', async () => {
    const { env, out } = environment()

    expect(await runCli(['--version'], env)).toBe(0)
    expect(out()).toBe('1.2.3\n')
  })

  it('reports bad input on stderr and exits 2, without serving anything', async () => {
    const serve = jest.fn()
    const { env, err } = environment({ serve })

    expect(await runCli(['serve', '--port', 'x', '--', 'p'], env)).toBe(2)
    expect(err()).toContain('treactui: --port must be')
    expect(serve).not.toHaveBeenCalled()
  })

  it('serves, says where, waits to be stopped, then closes the server', async () => {
    const order: string[] = []
    const serve = jest.fn(async () => ({ port: 4321, close: async () => { order.push('closed') } }))
    const { env, out, err } = environment({ serve, waitForStop: async () => { order.push('stopped') } })

    expect(await runCli(['serve', '--', 'python', 'app.py'], env)).toBe(0)
    expect(serve).toHaveBeenCalledWith(expect.objectContaining({ command: 'python', args: ['app.py'] }))
    expect(out()).toContain('ws://127.0.0.1:4321/term')
    expect(err()).toBe('')
    expect(order).toEqual(['stopped', 'closed'])
  })

  it('warns when the host is not a loopback address', async () => {
    const { env, err } = environment({ serve: async () => fakeServer() })

    await runCli(['serve', '--host', '0.0.0.0', '--', 'p'], env)

    expect(err()).toContain('0.0.0.0 is not a loopback address')
  })

  it('writes an IPv6 host in brackets in the URL', async () => {
    const { env, out, err } = environment({ serve: async () => fakeServer(7) })

    await runCli(['serve', '--host', '::1', '--path', '/t', '--', 'p'], env)

    expect(out()).toContain('ws://[::1]:7/t')
    expect(err()).toBe('')
  })

  it('exits 1 with the reason when the server cannot start', async () => {
    const { env, err } = environment({
      serve: async (): Promise<never> => {
        throw new Error('address in use')
      },
    })

    expect(await runCli(['serve', '--', 'p'], env)).toBe(1)
    expect(err()).toContain('cannot start the server: address in use')
  })

  it('serves a program end to end over a real WebSocket', async () => {
    let started: { command: string, args: string[], cols: number, rows: number } | undefined
    const pty: PtyLike = {
      onData: handler => { handler('hello from the program\r\n') },
      onExit: () => undefined,
      write:  () => undefined,
      resize: () => undefined,
      kill:   () => undefined,
    }
    const serve: CliEnvironment['serve'] = async options => serveCommand({
      ...options,
      spawnPty: (command, args, spawnOptions) => {
        started = { command, args, cols: spawnOptions.cols, rows: spawnOptions.rows }

        return pty
      },
    })
    let stopRequested = false
    let port: number | undefined
    const frames: string[] = []
    const { env } = environment({
      serve,
      write: text => {
        const match = /:(\d+)\/term/.exec(text)
        if (match) port = Number(match[1])
      },
      waitForStop: async () => until(() => stopRequested),
    })

    const exit = runCli(['serve', '--port', '0', '--', 'python', 'app.py'], env)
    await until(() => port !== undefined)
    const socket = new WebSocket(`ws://127.0.0.1:${port}/term`)
    socket.on('message', data => { frames.push(String(data)) })
    await new Promise(resolve => socket.once('open', resolve))
    socket.send(JSON.stringify({ type: 'resize', cols: 100, rows: 30 }))
    await until(() => frames.some(frame => frame.includes('hello from the program')))
    socket.close()
    stopRequested = true

    expect(await exit).toBe(0)
    expect(started).toEqual({ command: 'python', args: ['app.py'], cols: 100, rows: 30 })
    expect(frames.some(frame => (JSON.parse(frame) as { type: string }).type === 'hello')).toBe(true)
  })
})
