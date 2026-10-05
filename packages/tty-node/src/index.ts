// Serve a program to @trectui/tty.
export { serveCommand } from './serve-command'
export type { ServeCommandOptions } from './serve-command'
export { serveInk } from './serve-ink'
export type { ServeInkOptions } from './serve-ink'

// From inside the served program: speak to the page.
export { announce, publishSnapshot } from './osc-channel'

// Building blocks, for a custom server or session.
export { isOriginAllowed, serveTty } from './websocket-server'
export type { ServeTtyOptions, TtyServer } from './websocket-server'
export { runInkSession } from './ink-session'
export type { InkInstanceLike, InkSessionContext, InkSessionOptions } from './ink-session'
export { runPtySession } from './pty-session'
export type { PtyLike, PtySessionOptions, SpawnPty, SpawnPtyOptions } from './pty-session'
export { createAppMessageExtractor, isRunningUnderTty, publishAppMessage } from './osc-channel'
export type { Transport } from './session-transport'
