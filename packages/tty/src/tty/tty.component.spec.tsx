import { act, render, screen } from '@testing-library/react'
import type { SocketLike } from '../transport'
import { TTY } from './tty.component'

const written: string[] = []

jest.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    open () {}
    attachCustomKeyEventHandler () {}
    onData () {}
    onResize () {}
    blur () {}
    dispose () {}
    write (data: string) { written.push(data) }
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
})
