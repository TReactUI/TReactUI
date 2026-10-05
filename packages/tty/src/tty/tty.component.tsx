import { useEffect, useId, useRef } from 'react'
import { AccessibilityLayer, visuallyHidden } from '../accessibility-layer'
import { CommandLauncher } from '../command-launcher'
import { TerminalView } from '../terminal-view'
import type { TerminalHandle } from '../terminal-view'
import { summarizeCommandOutput } from './summarize-command-output.algorithm'
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
  const regionId = useId()
  const summaryId = useId()
  const session = useTtySession({ url, onEvent, createSocket, onOutput: data => terminalRef.current?.write(data) })
  const { snapshot, announcement, commands, phase, run, recordOutput } = session

  // When a command ends, read what it printed while the terminal still holds it.
  useEffect(() => {
    if (phase !== 'finished') return
    let cancelled = false
    void (terminalRef.current?.readLines() ?? Promise.resolve([])).then(lines => {
      if (!cancelled) recordOutput(lines)
    })

    return () => {
      cancelled = true
    }
  }, [phase, recordOutput])

  // Put focus on the way back only once the outcome is there to be read with the button:
  // a screen reader speaks a button's description when it takes focus, not afterwards.
  const outputReady = phase === 'finished' && run?.output !== undefined
  useEffect(() => {
    if (outputReady) backButtonRef.current?.focus()
  }, [outputReady])

  // The terminal's own text is exposed as 64 near-empty rows; once the output is offered as text, hide them.
  const terminalHidden = outputReady
  const showTerminal = phase !== 'choosing'

  // Escape from the terminal into the described screen, if there is one, so a screen reader
  // is in browse mode there and can read it with the arrow keys.
  const focusScreenRegion = (): boolean => {
    if (snapshot === undefined) return false
    const region = document.getElementById(regionId)
    if (region === null) return false
    // Focusable only for this move, so the region is not in the page's normal focus or accessibility behaviour.
    region.tabIndex = -1
    region.focus()

    return true
  }

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
        <>
          <div style={{ padding: '4px 8px' }}>
            <span role='status'>{exitSummary(run)}</span>
            {' '}
            <button
              type='button'
              ref={backButtonRef}
              aria-describedby={run.output === undefined ? undefined : summaryId}
              onClick={session.backToCommands}
            >
              Back to commands
            </button>
          </div>
          {run.output !== undefined && (
            <>
              {/* Only the button's description: aria-hidden keeps it from being read a second time in browse mode. */}
              <span id={summaryId} aria-hidden='true' style={visuallyHidden}>{`${exitSummary(run)}. ${summarizeCommandOutput(run.output)}`}</span>
              <section aria-label={`Output of ${run.command}`} style={visuallyHidden}>
                <pre>{run.output.join('\n')}</pre>
              </section>
            </>
          )}
        </>
      )}
      {showTerminal && (
        <TerminalView
          ariaLabel={label}
          screenReaderMode={snapshot === undefined}
          focusOnMount={phase === 'running'}
          hiddenFromAssistiveTech={terminalHidden}
          onEscape={focusScreenRegion}
          onReady={handle => {
            terminalRef.current = handle
            if (handle !== undefined) session.terminalReady()
          }}
          onInput={session.sendInput}
          onResize={session.sendResize}
        />
      )}
      <AccessibilityLayer snapshot={snapshot} announcement={announcement} regionId={regionId} />
    </div>
  )
}

function exitSummary (run: RunSummary): string {
  if (run.stopped === true) return `${run.command} stopped`

  return `${run.command} exited${run.exitCode === undefined ? '' : ` with code ${run.exitCode}`}`
}
