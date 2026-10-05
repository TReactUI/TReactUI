import { useEffect, useRef } from 'react'
import { AccessibilityLayer } from '../accessibility-layer'
import { CommandLauncher } from '../command-launcher'
import { TerminalView } from '../terminal-view'
import type { TerminalHandle } from '../terminal-view'
import type { TTYProps } from './tty-props.contract'
import { useTtySession } from './tty-session.hook'
import type { RunSummary } from './tty-session.hook'

/**
 * A real terminal in the browser, wired to a backend over WebSocket, with a
 * semantic accessibility layer beside it. When the backend offers commands
 * (for example a commander CLI), an accessible form to pick and run one comes first.
 *
 * @example
 * <TTY url="ws://localhost:8080/term" />
 */
export function TTY ({ url, label = 'Terminal', className, onEvent, createSocket }: TTYProps) {
  const terminalRef = useRef<TerminalHandle>(undefined)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const session = useTtySession({ url, onEvent, createSocket, onOutput: data => terminalRef.current?.write(data) })
  const { snapshot, announcement, commands, phase, run } = session

  // When a command ends, the terminal's output stays to be read; put focus on the way back.
  useEffect(() => {
    if (phase === 'finished') backButtonRef.current?.focus()
  }, [phase])

  const showTerminal = phase !== 'choosing'

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {phase === 'choosing' && commands !== undefined && <CommandLauncher commands={commands} onRun={session.requestRun} />}
      {phase === 'running' && run !== undefined && (
        <div style={{ padding: '4px 8px' }}>
          <span role='status'>{`Running ${run.command}`}</span>
          {' '}
          <button type='button' onClick={session.stop}>Stop</button>
        </div>
      )}
      {phase === 'finished' && run !== undefined && (
        <div style={{ padding: '4px 8px' }}>
          <span role='status'>{exitSummary(run)}</span>
          {' '}
          <button type='button' ref={backButtonRef} onClick={session.backToCommands}>Back to commands</button>
        </div>
      )}
      {showTerminal && (
        <TerminalView
          ariaLabel={label}
          screenReaderMode={snapshot === undefined}
          focusOnMount={phase === 'running'}
          onReady={handle => {
            terminalRef.current = handle
            if (handle !== undefined) session.terminalReady()
          }}
          onInput={session.sendInput}
          onResize={session.sendResize}
        />
      )}
      <AccessibilityLayer snapshot={snapshot} announcement={announcement} />
    </div>
  )
}

function exitSummary (run: RunSummary): string {
  if (run.stopped === true) return `${run.command} stopped`

  return `${run.command} exited${run.exitCode === undefined ? '' : ` with code ${run.exitCode}`}`
}
