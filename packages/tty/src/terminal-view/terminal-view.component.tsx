import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef } from 'react'
import { isFocusEscapeChord } from './focus-escape.policy'
import { readBufferLines } from './read-buffer-lines.algorithm'
import { lostAnOldLine } from './scroll-trim.algorithm'
import { SCROLLBACK_LINES } from './scrollback.config'
import type { TerminalViewProps } from './terminal-view.contract'

/** A real terminal (xterm.js, DOM renderer). */
export function TerminalView ({
  onReady, onInput, onResize, screenReaderMode, focusOnMount = false, onEscape, hiddenFromAssistiveTech = false, ariaLabel,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal>(undefined)
  const callbacksRef = useRef({ onReady, onInput, onResize, onEscape })
  callbacksRef.current = { onReady, onInput, onResize, onEscape }
  const screenReaderModeRef = useRef(screenReaderMode)
  screenReaderModeRef.current = screenReaderMode
  const focusOnMountRef = useRef(focusOnMount)
  focusOnMountRef.current = focusOnMount

  useEffect(() => {
    const host = containerRef.current
    if (host === null) return

    // convertEol: a real TTY turns "\n" into "\r\n" on output, and TUI renderers
    // such as Bubble Tea rely on that; without it the cursor keeps its column.
    const terminal = new Terminal({ convertEol: true, screenReaderMode: screenReaderModeRef.current, cursorBlink: true, scrollback: SCROLLBACK_LINES })
    terminalRef.current = terminal
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(host)
    fit.fit()
    // Fits whenever the container changes size, which covers window resizes too;
    // the terminal's own onResize then tells the backend the new cell size.
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => fit.fit())
    observer?.observe(host)
    terminal.attachCustomKeyEventHandler(event => {
      if (event.type === 'keydown' && isFocusEscapeChord(event)) {
        terminal.blur()
        // Never leave focus on the bare document: a screen reader would stay in focus mode.
        // The container is made focusable only now, so its normal accessibility tree is unchanged.
        if (callbacksRef.current.onEscape?.() !== true) {
          host.tabIndex = -1
          host.focus()
        }

        return false
      }

      return true
    })
    // The terminal keeps a bounded scrollback; count what it throws away, so that what is read back from it can
    // say that it is not the whole output.
    let droppedLines = 0
    let lengthBefore = terminal.buffer.active.length
    terminal.onScroll(() => {
      const lengthAfter = terminal.buffer.active.length
      if (lostAnOldLine(lengthBefore, lengthAfter, SCROLLBACK_LINES + terminal.rows)) droppedLines++
      lengthBefore = lengthAfter
    })
    terminal.onData(data => callbacksRef.current.onInput(data))
    terminal.onResize(({ cols, rows }) => callbacksRef.current.onResize(cols, rows))
    callbacksRef.current.onResize(terminal.cols, terminal.rows)
    callbacksRef.current.onReady({
      write:     data => terminal.write(data),
      // An empty write completes after everything queued before it has been parsed.
      readLines: async () => new Promise(resolve => terminal.write('', () => resolve({ lines: readBufferLines(terminal.buffer.active), droppedLines }))),
    })
    if (focusOnMountRef.current) terminal.focus()

    return () => {
      observer?.disconnect()
      callbacksRef.current.onReady(undefined)
      terminal.dispose()
      terminalRef.current = undefined
    }
  }, [])

  useEffect(() => {
    if (terminalRef.current !== undefined) terminalRef.current.options.screenReaderMode = screenReaderMode
  }, [screenReaderMode])

  return (
    <div
      ref={containerRef}
      role='group'
      aria-label={ariaLabel}
      aria-hidden={hiddenFromAssistiveTech ? true : undefined}
      style={{ flex: 1, minHeight: 0 }}
    />
  )
}
