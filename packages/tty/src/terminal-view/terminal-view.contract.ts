/** What the terminal holds, which is not always everything that was written to it. */
export interface TerminalText {
  /** The text now on the terminal, one string per line. */
  lines:        string[]
  /** How many older lines scrolled out of the terminal's scrollback and are gone. */
  droppedLines: number
}

/** What the rest of the library may do to the terminal. */
export interface TerminalHandle {
  write:     (data: string) => void
  /**
   * The text now on the terminal. Resolves once everything written so far has been
   * processed, so it is safe to call right after the last output arrived.
   */
  readLines: () => Promise<TerminalText>
}

export interface TerminalViewProps {
  /** Receives the handle once the terminal exists, and `undefined` when it goes away. */
  onReady:                  (handle: TerminalHandle | undefined) => void
  /** Keystrokes and pastes typed by the user. */
  onInput:                  (data: string) => void
  /** The terminal's size in cells, on mount and after every change. */
  onResize:                 (cols: number, rows: number) => void
  /**
   * Makes xterm.js expose its buffer to screen readers. Turn it off when a
   * semantic layer describes the screen, or both are read.
   */
  screenReaderMode:         boolean
  /** Gives the terminal keyboard focus when it appears. */
  focusOnMount?:            boolean
  /**
   * Called when the user presses the escape chord, after the terminal has let go
   * of the keyboard. Return true if it moved focus somewhere; otherwise focus goes
   * to the terminal's own container, so it never falls to the bare document
   * (where a screen reader stays in focus mode and browse-mode keys do nothing).
   */
  onEscape?:                () => boolean
  /** Removes the terminal from the accessibility tree, once its text is offered another way. */
  hiddenFromAssistiveTech?: boolean
  ariaLabel?:               string
}
