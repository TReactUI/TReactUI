import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer } from 'ws'
import type { Transport } from '../session-transport'
import { isOriginAllowed } from './origin.policy'
import { createWebSocketTransport } from './websocket-transport.client'

export interface ServeTtyOptions {
  /** 0 picks a free port. Default 8080. */
  port?:           number
  /** Default 127.0.0.1: the endpoint runs programs, so it is not exposed to the network unless asked. */
  host?:           string
  /** Default `/term`. */
  path?:           string
  /** Extra pages allowed to connect, as a host (`localhost:4200`) or a full origin. Same-host pages always may. */
  allowedOrigins?: readonly string[]
  /** Called with each accepted browser; start a session on the transport. */
  createSession:   (transport: Transport) => void
}

export interface TtyServer {
  /** The port actually bound. */
  port:  number
  close: () => Promise<void>
}

/** Serves sessions over a WebSocket, refusing foreign pages and other paths. */
export async function serveTty (options: ServeTtyOptions): Promise<TtyServer> {
  const path = options.path ?? '/term'
  const allowedOrigins = options.allowedOrigins ?? []
  const webSockets = new WebSocketServer({ noServer: true })
  const server = createServer((_request, response) => {
    response.writeHead(404).end()
  })

  server.on('upgrade', (request, socket, head) => {
    const requested = new URL(request.url ?? '/', 'http://placeholder').pathname
    if (requested !== path) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n')
      socket.destroy()

      return
    }
    if (!isOriginAllowed({ origin: request.headers.origin, host: request.headers.host, allowedOrigins })) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
      socket.destroy()

      return
    }
    webSockets.handleUpgrade(request, socket, head, accepted => {
      options.createSession(createWebSocketTransport(accepted))
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 8080, options.host ?? '127.0.0.1', resolve)
  })

  return {
    port: (server.address() as AddressInfo).port,
    async close () {
      for (const client of webSockets.clients) client.terminate()
      webSockets.close()
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}
