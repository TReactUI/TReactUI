import { runSession } from '../session-lifecycle'
import type { Transport } from '../session-transport'
import type { InkSessionOptions } from './ink-session.contract'
import { createTtyStreams } from './tty-streams.store'

const CRLF = '\r\n'

/**
 * Runs an Ink app in this process for one browser, with no PTY and no native
 * module: the app draws to fake terminal streams whose output goes to the page.
 */
export function runInkSession (transport: Transport, options: InkSessionOptions): void {
  runSession(transport, {
    startDelayMs: options.startDelayMs,
    async start (size, host) {
      let disposed = false
      const streams = createTtyStreams(size, data => host.send({ type: 'output', data }))

      const instance = await options.render({
        stdin:           streams.stdin,
        stdout:          streams.stdout,
        announce:        (text, politeness = 'polite') => host.send({ type: 'announce', text, politeness }),
        publishSnapshot: snapshot => host.send({ type: 'a11y-snapshot', snapshot }),
        emitEvent:       (name, payload) => host.send({ type: 'event', name, payload }),
      })

      void (async () => {
        let exitCode = 0
        try {
          await instance.waitUntilExit()
        } catch (error) {
          exitCode = 1
          if (!disposed) host.send({ type: 'output', data: CRLF + (error instanceof Error ? error.message : String(error)) + CRLF })
        }
        if (disposed) return
        host.send({ type: 'event', name: 'exit', payload: { exitCode } })
        host.close()
      })()

      return {
        write:  streams.input,
        resize: streams.resize,
        dispose () {
          disposed = true
          instance.unmount()
          streams.dispose()
        },
      }
    },
  })
}
