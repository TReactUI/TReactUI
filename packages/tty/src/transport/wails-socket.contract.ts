/** The part of Wails' `window.runtime` the transport uses; lets tests supply a fake. */
export interface EventsRuntime {
  /** Calls `callback` with the data of each event called `name`; returns a function that stops it. */
  EventsOn:   (name: string, callback: (...data: unknown[]) => void) => () => void
  /** Sends an event called `name`, with `data`, to Go. */
  EventsEmit: (name: string, ...data: unknown[]) => void
}

export interface WailsSocketOptions {
  /** Defaults to `window.runtime`, which Wails puts on every page it serves. */
  runtime?: EventsRuntime
  /**
   * Names the two events, `<prefix>:up` and `<prefix>:down`. Must match the Go side
   * (`ttygo.BindOptions.Prefix`). Defaults to `treactui`.
   */
  prefix?:  string
}
