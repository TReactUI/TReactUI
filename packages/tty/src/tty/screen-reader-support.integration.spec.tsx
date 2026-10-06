import { act, render, screen, waitFor } from '@testing-library/react'
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
    onScroll () {}
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

  it('announces the new selection when the selected option changes, but not the first screen', async () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)

    backend.deliver(screenWithSelection(0))
    expect(politeRegion()?.textContent).toBe('')

    backend.deliver(screenWithSelection(1))
    expect(politeRegion()?.textContent).toBe('Second task')

    // Announcements are paced (a second one within the interval is held), so the next one is a moment away.
    backend.deliver(screenWithSelection(2))
    await waitFor(() => expect(politeRegion()?.textContent).toBe('Third task'))
  })

  it('keeps a quick run of selection changes to a pace a screen reader can follow: the first at once, then only the last', async () => {
    const backend = connectedSocket()
    render(<TTY url='ws://x' createSocket={() => backend.socket} />)
    const seen: string[] = []
    new MutationObserver(() => { seen.push(politeRegion()?.textContent ?? '') }).observe(politeRegion() as Node, { childList: true, characterData: true, subtree: true })
    backend.deliver(screenWithSelection(0))

    // Holding the arrow key down: every option in turn, and back, within a few milliseconds.
    for (const index of [1, 2, 3, 4, 3, 2, 1, 2]) backend.deliver(screenWithSelection(index))

    await waitFor(() => expect(politeRegion()?.textContent).toBe('Third task'))
    const spoken = seen.filter(text => text !== '')
    expect(spoken[0]).toBe('Second task')
    expect(spoken.at(-1)).toBe('Third task')
    expect(spoken.length).toBeLessThanOrEqual(2)
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
