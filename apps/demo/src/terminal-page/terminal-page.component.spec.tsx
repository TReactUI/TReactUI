import { render, screen } from '@testing-library/react'
import { TerminalPage } from './terminal-page.component'

jest.mock('@trectui/tty', () => ({ TTY: ({ url }: { url: string }) => <div data-testid='tty'>{url}</div> }))

describe('TerminalPage', () => {
  it('renders a TTY pointed at the demo server', () => {
    render(<TerminalPage />)

    expect(screen.getByTestId('tty')).toHaveProperty('textContent', 'ws://localhost:8080/term')
  })
})
