/** What the rest of the library may do to the terminal. */
export interface TerminalHandle {
  write: (data: string) => void
}

export interface TerminalViewProps {
  /** Receives the handle once the terminal exists. */
  onReady:    (handle: TerminalHandle) => void
  /** Keystrokes and pastes typed by the user. */
  onInput:    (data: string) => void
  /** The terminal's size in cells, on mount and after every change. */
  onResize:   (cols: number, rows: number) => void
  ariaLabel?: string
}
