import { act, render, screen } from '@testing-library/react'
import type { SocketLike } from '../transport'
import { TTY } from './tty.component'

type KeyHandler = (event: { type: string, key: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean }) => boolean

const keyHandlers: KeyHandler[] = []

jest.mock('@xterm/xterm', () => ({
  Terminal: class {
    options: Record<string, unknown> = {}
    cols = 80
    rows = 24
    buffer = { active: { length: 0, getLine: () => undefined } }

    open () {}
    loadAddon () {}
    attachCustomKeyEventHandler (handler: KeyHandler) { keyHandlers.push(handler) }
    onData () {}
    onResize () {}
    blur () {}
    focus () {}
    dispose () {}
    write (_data?: string, callback?: () => void) { callback?.() }
  },
}))
jest.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit () {} } }))
jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true })

type Listener = (event: { data?: unknown }) => void

function connectedSocket () {
  const listeners: Record<string, Listener> = {}
  const socket: SocketLike = {
    send:  () => {},
    close: () => {},
    addEventListener (type, listener) { listeners[type] = listener },
  }

  return {
    socket,
    deliver: (message: unknown) => { act(() => { listeners['message']?.({ data: JSON.stringify(message) }) }) },
  }
}

const screenWithSelection = (selected: number) => ({
  type:     'a11y-snapshot',
  snapshot: {
    title: 'Tasks',
    nodes: [{
      role:     'listbox',
      label:    'Tasks',
      children: ['First task', 'Second task', 'Third task'].map((label, index) => ({ role: 'option', label, selected: index === selected })),
    }],
  },
})

const escapeChord = { type: 'keydown', key: 'M', ctrlKey: true, shiftKey: true, altKey: false }
const politeRegion = () => screen.getAllByRole('status').at(-1)

describe('TTY for screen reader users', () => {
  beforeEach(() => { keyHandlers.length = 0 })

  it('announces the new selection when the selected option changes, but not the first screen', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)

    backend.deliver(screenWithSelection(0))
    expect(politeRegion()?.textContent).toBe('')

    backend.deliver(screenWithSelection(1))
    expect(politeRegion()?.textContent).toBe('Second task')

    backend.deliver(screenWithSelection(2))
    expect(politeRegion()?.textContent).toBe('Third task')
  })

  it('says nothing when a redraw leaves the selection where it was', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)
    backend.deliver(screenWithSelection(1))

    backend.deliver(screenWithSelection(1))

    expect(politeRegion()?.textContent).toBe('')
  })

  it('moves focus into the described screen on the escape chord, so a screen reader can read it in browse mode', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)
    backend.deliver(screenWithSelection(0))

    const handledByTerminal = keyHandlers.at(-1)?.(escapeChord)

    expect(handledByTerminal).toBe(false)
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Tasks' }))
  })

  it('lands on the terminal itself, never the bare document, when there is no described screen', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)

    keyHandlers.at(-1)?.(escapeChord)

    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Terminal' }))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('leaves every other key to the terminal', () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)
    backend.deliver(screenWithSelection(0))

    expect(keyHandlers.at(-1)?.({ type: 'keydown', key: 'a', ctrlKey: false, shiftKey: false, altKey: false })).toBe(true)
    expect(document.activeElement).toBe(document.body)
  })
})
