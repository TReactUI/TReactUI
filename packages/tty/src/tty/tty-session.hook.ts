import type { A11ySnapshot, CommandSpec, Politeness } from '@treactui/protocol'
import { useCallback, useEffect, useRef, useState } from 'react'
import { selectedOptionLabel } from '../accessibility-layer'
import type { TerminalText } from '../terminal-view'
import { openTtyConnection } from '../transport'
import type { TtyConnection } from '../transport'
import { createAnnouncementLimiter } from './announcement-limiter.store'
import type { TTYProps } from './tty-props.contract'

interface TtySessionOptions extends Pick<TTYProps, 'url' | 'onEvent' | 'createSocket'> {
  onOutput: (data: string) => void
}

/**
 * Where the session is. A backend that offers commands starts at `choosing`;
 * one that serves a single program stays at `terminal`.
 */
export type TtyPhase = 'terminal' | 'choosing' | 'running' | 'finished'

export interface RunSummary {
  command:       string
  exitCode?:     number
  /** The user pressed Stop, so the exit code is the platform's kill status, not news. */
  stopped?:      boolean
  /** What the command printed, once it has ended: what the terminal still holds. */
  output?:       string[]
  /** How many earlier lines the terminal had already discarded. The output is then only the end of what was printed. */
  droppedLines?: number
}

interface TtySession {
  snapshot:       A11ySnapshot | undefined
  announcement:   { text: string, politeness: Politeness } | undefined
  commands:       CommandSpec[] | undefined
  phase:          TtyPhase
  run:            RunSummary | undefined
  sendInput:      (data: string) => void
  sendResize:     (cols: number, rows: number) => void
  /** Asks to run a command; it is sent once the terminal that will show it exists. */
  requestRun:     (command: string, args: string[]) => void
  /** Call when the terminal exists, so a requested run can start at its size. */
  terminalReady:  () => void
  /** Keeps what the finished command printed, so it can be offered as text. */
  recordOutput:   (text: TerminalText) => void
  stop:           () => void
  backToCommands: () => void
}

const exitCodeOf = (payload: unknown): number | undefined =>
  typeof payload === 'object' && payload !== null && 'exitCode' in payload && typeof payload.exitCode === 'number' ? payload.exitCode : undefined

/** Owns the connection to the backend and the state it streams: output, accessibility, and the command launcher. */
export function useTtySession ({ url, onEvent, onOutput, createSocket }: TtySessionOptions): TtySession {
  const [snapshot, setSnapshot] = useState<A11ySnapshot>()
  const [announcement, setAnnouncement] = useState<TtySession['announcement']>()
  const [commands, setCommands] = useState<CommandSpec[]>()
  const [phase, setPhase] = useState<TtyPhase>('terminal')
  const [run, setRun] = useState<RunSummary>()
  const connectionRef = useRef<TtyConnection>(undefined)
  // The terminal reports its size before the connection exists; keep the latest to send on connect.
  const sizeRef = useRef<{ cols: number, rows: number }>(undefined)
  const pendingRunRef = useRef<{ command: string, args: string[] }>(undefined)
  // The selected option of the previous screen: arrow keys move it, and only speech tells a screen reader user.
  const selectedRef = useRef<string>(undefined)
  const handlersRef = useRef({ onEvent, onOutput })
  handlersRef.current = { onEvent, onOutput }

  useEffect(() => {
    // However fast the backend announces, a screen reader is given a pace it can follow.
    const announcements = createAnnouncementLimiter(setAnnouncement)
    const opened = openTtyConnection({
      url,
      createSocket,
      onMessage (message) {
        switch (message.type) {
          case 'output': {
            handlersRef.current.onOutput(message.data)
            break
          }
          case 'a11y-snapshot': {
            const selected = selectedOptionLabel(message.snapshot)
            if (selected !== undefined && selectedRef.current !== undefined && selected !== selectedRef.current) {
              announcements.offer({ text: selected, politeness: 'polite' })
            }
            selectedRef.current = selected
            setSnapshot(message.snapshot)
            break
          }
          case 'announce': {
            announcements.offer({ text: message.text, politeness: message.politeness })
            break
          }
          case 'commands': {
            setCommands(message.commands)
            setPhase('choosing')
            break
          }
          case 'event': {
            if (message.name === 'exit') {
              setPhase(current => current === 'running' ? 'finished' : current)
              setRun(current => current === undefined ? current : { ...current, exitCode: exitCodeOf(message.payload) })
            }
            handlersRef.current.onEvent?.(message.name, message.payload)
            break
          }
          case 'hello': {
            break
          }
        }
      },
    })
    connectionRef.current = opened
    if (sizeRef.current !== undefined) opened.send({ type: 'resize', ...sizeRef.current })

    return () => {
      announcements.dispose()
      opened.close()
      connectionRef.current = undefined
    }
  }, [url, createSocket])

  const sendInput = useCallback((data: string) => connectionRef.current?.send({ type: 'input', data }), [])
  const sendResize = useCallback((cols: number, rows: number) => {
    sizeRef.current = { cols, rows }
    connectionRef.current?.send({ type: 'resize', cols, rows })
  }, [])
  const requestRun = useCallback((command: string, args: string[]) => {
    pendingRunRef.current = { command, args }
    setRun({ command })
    setPhase('running')
  }, [])
  const terminalReady = useCallback(() => {
    const pending = pendingRunRef.current
    pendingRunRef.current = undefined
    if (pending !== undefined) connectionRef.current?.send({ type: 'run', ...pending })
  }, [])
  const recordOutput = useCallback(({ lines, droppedLines }: TerminalText) => {
    setRun(current => current === undefined ? current : { ...current, output: lines, droppedLines })
  }, [])
  const stop = useCallback(() => {
    setRun(current => current === undefined ? current : { ...current, stopped: true })
    connectionRef.current?.send({ type: 'stop' })
  }, [])
  const backToCommands = useCallback(() => {
    setRun(undefined)
    setPhase('choosing')
  }, [])

  return { snapshot, announcement, commands, phase, run, sendInput, sendResize, requestRun, terminalReady, recordOutput, stop, backToCommands }
}
