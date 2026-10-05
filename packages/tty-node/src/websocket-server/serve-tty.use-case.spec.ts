import { WebSocket } from 'ws'
import { serveTty } from './serve-tty.use-case'
import type { TtyServer } from './serve-tty.use-case'

let server: TtyServer | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
})

/** Resolves with what the handshake produced: 'open', or the HTTP status that refused it. */
async function connect (url: string, origin?: string): Promise<string> {
  return new Promise(resolve => {
    const client = new WebSocket(url, { origin })
    client.on('open', () => {
      client.close()
      resolve('open')
    })
    client.on('unexpected-response', (_request, response) => resolve(String(response.statusCode)))
    client.on('error', () => resolve('error'))
  })
}

describe('serveTty', () => {
  it('hands each accepted browser to the session factory, in both directions', async () => {
    const received: string[] = []
    server = await serveTty({
      port:          0,
      createSession: transport => {
        transport.onFrame(frame => { received.push(frame) })
        transport.send('hello from the server')
      },
    })

    const client = new WebSocket(`ws://127.0.0.1:${server.port}/term`)
    const fromServer = await new Promise<string>(resolve => client.on('message', data => resolve(String(data))))
    client.send('hi')
    await new Promise<void>(resolve => setTimeout(resolve, 50))
    client.close()

    expect(fromServer).toBe('hello from the server')
    expect(received).toEqual(['hi'])
  })

  it('refuses a foreign page with 403 and an unknown path with 404, but lets a listed page in', async () => {
    const createSession = jest.fn()
    server = await serveTty({ port: 0, allowedOrigins: ['localhost:4200'], createSession })
    const base = `ws://127.0.0.1:${server.port}`

    expect(await connect(`${base}/term`, 'https://evil.example')).toBe('403')
    expect(await connect(`${base}/elsewhere`)).toBe('404')
    expect(await connect(`${base}/term`, 'http://localhost:4200')).toBe('open')
    expect(createSession).toHaveBeenCalledTimes(1)
  })
})
