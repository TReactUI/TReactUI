import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef } from 'react'
import { isFocusEscapeChord } from './focus-escape.policy'
import type { TerminalViewProps } from './terminal-view.contract'

/** A real terminal (xterm.js, DOM renderer) with screen-reader mode on. */
export function TerminalView ({ onReady, onInput, onResize, ariaLabel }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbacksRef = useRef({ onReady, onInput, onResize })
  callbacksRef.current = { onReady, onInput, onResize }

  useEffect(() => {
    const host = containerRef.current
    if (host === null) return

    const terminal = new Terminal({ screenReaderMode: true, cursorBlink: true })
    terminal.open(host)
    terminal.attachCustomKeyEventHandler(event => {
      if (event.type === 'keydown' && isFocusEscapeChord(event)) {
        terminal.blur()

        return false
      }

      return true
    })
    terminal.onData(data => callbacksRef.current.onInput(data))
    terminal.onResize(({ cols, rows }) => callbacksRef.current.onResize(cols, rows))
    callbacksRef.current.onResize(terminal.cols, terminal.rows)
    callbacksRef.current.onReady({ write: data => terminal.write(data) })

    return () => terminal.dispose()
  }, [])

  return <div ref={containerRef} aria-label={ariaLabel} />
}
