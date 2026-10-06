import { act, fireEvent, render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AccessibilityLayer } from '../accessibility-layer'
import { CommandLauncher } from '../command-launcher'
import type { SocketLike } from '../transport'
import { TTY } from './tty.component'

expect.extend(toHaveNoViolations)

jest.mock('@xterm/xterm', () => ({
  Terminal: class {
    options: Record<string, unknown> = {}
    cols = 80
    rows = 24
    buffer = { active: { length: 1, getLine: () => ({ translateToString: () => '3... 2... 1... Liftoff!' }) } }

    open () {}
    loadAddon () {}
    attachCustomKeyEventHandler () {}
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

const noop = (): void => {}

const greet = {
  name:        'greet',
  description: 'Print a greeting',
  arguments:   [{ name: 'name', description: 'who to greet', required: true, variadic: false }],
  options:     [
    { flag: '--shout', short: '-s', description: 'greet loudly', takesValue: false, required: false },
    { flag: '--mode', takesValue: true, valueName: 'mode', choices: ['a', 'b'], required: true },
  ],
}

/** What axe can check in jsdom: structure, names, roles, ARIA use. It cannot compute colour contrast. */
describe('accessibility (axe)', () => {
  it('the command launcher has no violations, and none with its errors showing', async () => {
    const { container } = render(<CommandLauncher commands={[greet, { name: 'countdown', arguments: [], options: [] }]} onRun={jest.fn()} />)

    expect(await axe(container)).toHaveNoViolations()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the accessibility layer has no violations with a screen described, and with announcements', async () => {
    const snapshot = {
      title: 'Downloads',
      nodes: [
        { role: 'heading' as const, value: 'Queue' },
        { role: 'listbox' as const, label: 'Queue', children: [{ role: 'option' as const, label: 'Song A', selected: true }, { role: 'option' as const, label: 'Song B' }] },
        { role: 'progressbar' as const, label: 'Progress', valueNow: 40 },
        { role: 'textbox' as const, label: 'URL', value: 'https://a' },
      ],
    }
    const { container, rerender } = render(<AccessibilityLayer snapshot={snapshot} />)

    expect(await axe(container)).toHaveNoViolations()

    rerender(<AccessibilityLayer snapshot={snapshot} announcement={{ text: 'Done', politeness: 'assertive' }} />)

    expect(await axe(container)).toHaveNoViolations()
  })

  it('the TTY has no violations while a command runs, and when it has finished', async () => {
    let onMessage: (event: { data?: unknown }) => void = noop
    const socket: SocketLike = {
      send:  () => {},
      close: () => {},
      addEventListener (type, listener) {
        if (type === 'message') onMessage = listener
      },
    }
    const deliver = (message: unknown): void => {
      act(() => {
        onMessage({ data: JSON.stringify(message) })
      })
    }
    const { container } = render(<TTY url='ws://x' createSocket={() => socket} />)
    deliver({ type: 'commands', commands: [{ name: 'countdown', arguments: [], options: [] }] })
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(screen.getByText('Running countdown')).toBeTruthy()
    expect(await axe(container)).toHaveNoViolations()

    deliver({ type: 'event', name: 'exit', payload: { exitCode: 0 } })

    expect(screen.getByRole('button', { name: 'Back to commands' })).toBeTruthy()
    // The output is read from the terminal asynchronously and offered as its own region.
    expect(await screen.findByRole('region', { name: 'Output of countdown' })).toBeTruthy()
    expect(await axe(container)).toHaveNoViolations()
  })
})
