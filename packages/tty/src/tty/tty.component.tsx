import { useRef } from 'react'
import { AccessibilityLayer } from '../accessibility-layer'
import { TerminalView } from '../terminal-view'
import type { TerminalHandle } from '../terminal-view'
import type { TTYProps } from './tty-props.contract'
import { useTtySession } from './tty-session.hook'

/**
 * A real terminal in the browser, wired to a backend over WebSocket, with a
 * semantic accessibility layer beside it.
 *
 * @example
 * <TTY url="ws://localhost:8080/term" />
 */
export function TTY ({ url, label = 'Terminal', className, onEvent, createSocket }: TTYProps) {
  const terminalRef = useRef<TerminalHandle>(undefined)
  const { snapshot, announcement, sendInput, sendResize } = useTtySession({
    url, onEvent, createSocket, onOutput: data => terminalRef.current?.write(data),
  })

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TerminalView
        ariaLabel={label}
        screenReaderMode={snapshot === undefined}
        onReady={handle => { terminalRef.current = handle }}
        onInput={sendInput}
        onResize={sendResize}
      />
      <AccessibilityLayer snapshot={snapshot} announcement={announcement} />
    </div>
  )
}
