import { openTtyConnection } from './open-tty-connection.client'
import type { SocketLike } from './tty-connection.contract'

type Listener = (event: { data?: unknown }) => void

function fakeSocket (): SocketLike & { sent: string[], emit: (type: string, data?: unknown) => void } {
  const sent: string[] = []
  const listeners: Record<string, Listener[]> = {}

  return {
    sent,
    send (frame) {
      sent.push(frame)
    },
    close: jest.fn(),
    addEventListener (type, listener) {
      (listeners[type] ??= []).push(listener)
    },
    emit (type, data) {
      const forType = listeners[type] ?? []
      for (const listener of forType) listener({ data })
    },
  }
}

describe('openTtyConnection', () => {
  it('holds messages until the socket opens, then flushes them in order', () => {
    const socket = fakeSocket()
    const connection = openTtyConnection({ url: 'ws://x', onMessage: jest.fn(), createSocket: () => socket })

    connection.send({ type: 'resize', cols: 80, rows: 24 })
    expect(socket.sent).toEqual([])

    socket.emit('open')
    connection.send({ type: 'input', data: 'a' })
    expect(socket.sent.map(frame => JSON.parse(frame).type)).toEqual(['resize', 'input'])
  })

  it('delivers valid server messages and reports invalid ones', () => {
    const socket = fakeSocket()
    const onMessage = jest.fn()
    const onProtocolError = jest.fn()
    openTtyConnection({ url: 'ws://x', onMessage, onProtocolError, createSocket: () => socket })

    socket.emit('message', '{"type":"output","data":"hi"}')
    socket.emit('message', 'garbage')

    expect(onMessage).toHaveBeenCalledWith({ type: 'output', data: 'hi' })
    expect(onProtocolError).toHaveBeenCalledWith('frame is not valid JSON')
  })
})
