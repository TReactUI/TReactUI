import { act, fireEvent, render, screen } from '@testing-library/react'
import type { SocketLike } from '../transport'
import { TTY } from './tty.component'

jest.mock('@xterm/xterm', () => ({
  Terminal: class {
    options: Record<string, unknown> = {}
    cols = 80
    rows = 24

    open () {}
    loadAddon () {}
    attachCustomKeyEventHandler () {}
    onData () {}
    onResize () {}
    blur () {}
    focus () {}
    dispose () {}
    write () {}
  },
}))
jest.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit () {} } }))
jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true })

type Listener = (event: { data?: unknown }) => void

/** A socket the test can open and speak through, recording every frame the page sends. */
function connectedSocket () {
  const listeners: Record<string, Listener> = {}
  const sent: Array<Record<string, unknown>> = []
  const socket: SocketLike = {
    send:  frame => { sent.push(JSON.parse(frame)) },
    close: () => {},
    addEventListener (type, listener) { listeners[type] = listener },
  }

  return {
    socket,
    sent,
    open:    () => act(() => listeners['open']?.({})),
    deliver: (message: unknown) => { act(() => { listeners['message']?.({ data: JSON.stringify(message) }) }) },
  }
}

const greet = {
  name:      'greet',
  arguments: [{ name: 'name', required: true, variadic: false }],
  options:   [{ flag: '--shout', takesValue: false, required: false }],
}

describe('TTY with a command launcher', () => {
  it('offers the commands first, with the terminal out of the page', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)
    backend.open()

    backend.deliver({ type: 'commands', commands: [greet] })

    expect(screen.getByRole('heading', { name: 'Run a command' })).toBeTruthy()
    expect(screen.queryByLabelText('Terminal')).toBeNull()
  })

  it('shows the terminal for the run, sending its size before the run so the command starts at the right width', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)
    backend.open()
    backend.deliver({ type: 'commands', commands: [greet] })
    backend.sent.length = 0

    fireEvent.change(screen.getByRole('textbox', { name: 'name (required)' }), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '--shout' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(screen.getByText('Running greet').getAttribute('role')).toBe('status')
    expect(backend.sent).toEqual([
      { type: 'resize', cols: 80, rows: 24 },
      { type: 'run', command: 'greet', args: ['--shout', 'Ada'] },
    ])
  })

  it('keeps the output after the command exits, says how it ended and puts focus on the way back', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)
    backend.open()
    backend.deliver({ type: 'commands', commands: [greet] })
    fireEvent.change(screen.getByRole('textbox', { name: 'name (required)' }), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    backend.deliver({ type: 'event', name: 'exit', payload: { exitCode: 2 } })

    expect(screen.getByText('greet exited with code 2').getAttribute('role')).toBe('status')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Back to commands' }))

    fireEvent.click(screen.getByRole('button', { name: 'Back to commands' }))

    expect(screen.getByRole('heading', { name: 'Run a command' })).toBeTruthy()
  })

  it('stops the running command on request', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)
    backend.open()
    backend.deliver({ type: 'commands', commands: [{ ...greet, arguments: [], options: [] }] })
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))
    backend.sent.length = 0

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(backend.sent).toEqual([{ type: 'stop' }])

    backend.deliver({ type: 'event', name: 'exit', payload: { exitCode: -1_073_741_510 } })

    expect(screen.getByText('greet stopped')).toBeTruthy()
  })
})
