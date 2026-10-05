import { act, render, screen } from '@testing-library/react'
import type { SocketLike } from '../transport'
import { TTY } from './tty.component'

const written: string[] = []
const fitCalls = { count: 0 }
const constructed: Array<Record<string, unknown>> = []

jest.mock('@xterm/xterm', () => ({
  Terminal: class {
    options: Record<string, unknown> = {}
    cols = 80
    rows = 24

    constructor (options: Record<string, unknown>) { constructed.push(options) }
    open () {}
    loadAddon () {}
    attachCustomKeyEventHandler () {}
    onData () {}
    onResize () {}
    blur () {}
    focus () {}
    dispose () {}
    write (data: string) { written.push(data) }
  },
}))
jest.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit () { fitCalls.count++ }
  },
}))
jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true })

const noop = (): void => {}

describe('TTY', () => {
  it('writes backend output to the terminal and exposes snapshots and announcements', () => {
    let onMessage: (event: { data?: unknown }) => void = noop
    const socket: SocketLike = {
      send:  jest.fn(),
      close: jest.fn(),
      addEventListener (type, listener) {
        if (type === 'message') onMessage = listener
      },
    }
    render(<TTY url='ws://x' createSocket={() => socket} />)

    act(() => {
      onMessage({ data: '{"type":"output","data":"hello"}' })
      onMessage({ data: '{"type":"a11y-snapshot","snapshot":{"title":"Downloads","nodes":[]}}' })
      onMessage({ data: '{"type":"announce","text":"Done","politeness":"polite"}' })
    })

    expect(written).toEqual(['hello'])
    expect(screen.getByRole('region', { name: 'Downloads', hidden: true })).toBeTruthy()
    expect(screen.getByRole('status', { hidden: true }).textContent).toBe('Done')
  })

  it('converts bare newlines, which Bubble Tea relies on a TTY to do', () => {
    const socket: SocketLike = { send: jest.fn(), close: jest.fn(), addEventListener: jest.fn() }
    render(<TTY url='ws://x' createSocket={() => socket} />)

    expect(constructed.at(-1)).toMatchObject({ convertEol: true })
  })

  it('fits the terminal on mount and whenever its container is resized', () => {
    let notifyResize: () => void = noop
    class FakeResizeObserver {
      constructor (callback: () => void) { notifyResize = callback }
      observe () {}
      disconnect () {}
    }
    stubGlobal('ResizeObserver', FakeResizeObserver)
    const socket: SocketLike = { send: jest.fn(), close: jest.fn(), addEventListener: jest.fn() }
    fitCalls.count = 0
    render(<TTY url='ws://x' createSocket={() => socket} />)
    expect(fitCalls.count).toBe(1)

    notifyResize()

    expect(fitCalls.count).toBe(2)
  })

  it('sends the initial terminal size once connected, even though it is known before the connection', () => {
    const send = jest.fn()
    const socket: SocketLike = { send, close: jest.fn(), addEventListener: jest.fn() }
    render(<TTY url='ws://x' createSocket={() => socket} />)

    // Frames queue until the socket opens, so open it by invoking the registered listener.
    const openListener = (socket.addEventListener as jest.Mock).mock.calls.find(call => call[0] === 'open')?.[1]
    openListener()

    expect(send).toHaveBeenCalledWith('{"type":"resize","cols":80,"rows":24}')
  })
})

function stubGlobal (name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
}
