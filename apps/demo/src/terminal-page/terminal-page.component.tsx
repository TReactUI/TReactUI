import { TTY } from '@trectui/tty'
import { TERMINAL_URL } from './terminal-endpoint.config'

/** The demo page: one TTY, wired to the Go demo server. */
export function TerminalPage () {
  return (
    <main style={{ padding: 24 }}>
      <h1>@trectui/tty demo</h1>
      <p>Press Ctrl+Shift+M to move focus out of the terminal.</p>
      <TTY url={TERMINAL_URL} label='Tasks terminal' />
    </main>
  )
}
