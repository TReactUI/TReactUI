import { useCallback, useEffect, useRef, useState } from 'react'
import type { A11ySnapshot, Politeness } from '@trectui/protocol'
import { openTtyConnection } from '../transport'
import type { TtyConnection } from '../transport'
import type { TTYProps } from './tty-props.contract'

interface TtySessionOptions extends Pick<TTYProps, 'url' | 'onEvent' | 'createSocket'> {
  onOutput: (data: string) => void
}

interface TtySession {
  snapshot:     A11ySnapshot | undefined
  announcement: { text: string, politeness: Politeness } | undefined
  sendInput:    (data: string) => void
  sendResize:   (cols: number, rows: number) => void
}

/** Owns the connection to the backend and the accessibility state it streams. */
export function useTtySession ({ url, onEvent, onOutput, createSocket }: TtySessionOptions): TtySession {
  const [snapshot, setSnapshot] = useState<A11ySnapshot>()
  const [announcement, setAnnouncement] = useState<TtySession['announcement']>()
  const connectionRef = useRef<TtyConnection>(undefined)
  // The terminal reports its size before the connection exists; keep the latest to send on connect.
  const sizeRef = useRef<{ cols: number, rows: number }>(undefined)
  const handlersRef = useRef({ onEvent, onOutput })
  handlersRef.current = { onEvent, onOutput }

  useEffect(() => {
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
            setSnapshot(message.snapshot)
            break
          }
          case 'announce': {
            setAnnouncement({ text: message.text, politeness: message.politeness })
            break
          }
          case 'event': {
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
      opened.close()
      connectionRef.current = undefined
    }
  }, [url, createSocket])

  const sendInput = useCallback((data: string) => connectionRef.current?.send({ type: 'input', data }), [])
  const sendResize = useCallback((cols: number, rows: number) => {
    sizeRef.current = { cols, rows }
    connectionRef.current?.send({ type: 'resize', cols, rows })
  }, [])

  return { snapshot, announcement, sendInput, sendResize }
}
