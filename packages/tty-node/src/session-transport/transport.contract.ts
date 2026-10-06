/** Carries text frames to and from one browser. The WebSocket server implements it; tests use an in-memory one. */
export interface Transport {
  send:        (frame: string) => void
  onFrame:     (handler: (frame: string) => void) => void
  onClose:     (handler: () => void) => void
  close:       () => void
  /**
   * True while the browser has not yet received a lot of what was sent. A program that produces output faster
   * than the browser reads it should wait. Optional: a transport that has no way to know is never backed up.
   */
  isBackedUp?: () => boolean
  /** Calls `handler` each time a backed-up connection has caught up. Returns a function that stops it. */
  onDrain?:    (handler: () => void) => () => void
}
