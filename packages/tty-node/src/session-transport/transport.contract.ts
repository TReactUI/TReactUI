/** Carries text frames to and from one browser. The WebSocket server implements it; tests use an in-memory one. */
export interface Transport {
  send:    (frame: string) => void
  onFrame: (handler: (frame: string) => void) => void
  onClose: (handler: () => void) => void
  close:   () => void
}
