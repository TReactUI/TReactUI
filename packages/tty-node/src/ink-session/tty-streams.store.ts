import { PassThrough, Writable } from 'node:stream'

export interface TtyStreams {
  /** Looks like a terminal's input: a TTY that accepts raw mode. */
  stdin:   NodeJS.ReadStream
  /** Looks like a terminal's output: a TTY of the current size that reports resizes. */
  stdout:  NodeJS.WriteStream
  /** Types into stdin, as the user would. */
  input:   (data: string) => void
  /** Changes the size and tells the program through a `resize` event. */
  resize:  (cols: number, rows: number) => void
  dispose: () => void
}

/**
 * The streams a terminal program expects (`isTTY`, `columns`, `rows`,
 * `setRawMode`, `resize`), backed by memory instead of a real terminal. They
 * are stateful because the size changes over the life of the session.
 */
export function createTtyStreams (size: { cols: number, rows: number }, onOutput: (data: string) => void): TtyStreams {
  const input = new PassThrough()
  const stdin = Object.assign(input, {
    isTTY: true,
    isRaw: false,
    setRawMode (mode: boolean) {
      stdin.isRaw = mode

      return stdin
    },
    ref () { return stdin },
    unref () { return stdin },
  }) as unknown as NodeJS.ReadStream

  const output = new Writable({
    write (chunk: Buffer | string, _encoding, callback) {
      onOutput(String(chunk))
      callback()
    },
  })
  const stdout = Object.assign(output, {
    isTTY:         true,
    columns:       size.cols,
    rows:          size.rows,
    getColorDepth: () => 24,
    hasColors:     () => true,
    getWindowSize: () => [stdout.columns, stdout.rows],
  }) as unknown as NodeJS.WriteStream

  return {
    stdin,
    stdout,
    input: data => { input.write(data) },
    resize (cols, rows) {
      stdout.columns = cols
      stdout.rows = rows
      stdout.emit('resize')
    },
    dispose () {
      input.end()
      output.end()
    },
  }
}
