// Serve a program to @treactui/tty.
export { serveCommand } from './serve-command'
export type { ServeCommandOptions } from './serve-command'
export { serveCommander } from './serve-commander'
export type { ServeCommanderOptions } from './serve-commander'
export { serveInk } from './serve-ink'
export type { ServeInkOptions } from './serve-ink'

// From inside the served program: speak to the page.
export { announce, publishSnapshot } from './osc-channel'

// Building blocks, for a custom server or session.
export { isOriginAllowed, serveTty } from './websocket-server'
export type { ServeTtyOptions, TtyServer } from './websocket-server'
export { describeCommanderProgram } from './commander-catalog'
export type { CommanderCommandLike } from './commander-catalog'
export { runLauncherSession } from './command-launcher'
export type { LauncherOptions } from './command-launcher'
export { runInkSession } from './ink-session'
export type { InkInstanceLike, InkSessionContext, InkSessionOptions } from './ink-session'
export { runPtySession, startPtyProgram } from './pty-session'
export type { PtyLike, PtySessionOptions, SpawnPty, SpawnPtyOptions } from './pty-session'
export { createAppMessageExtractor, isRunningUnderTty, publishAppMessage } from './osc-channel'
export type { Transport } from './session-transport'
export { parseCliArguments, runCli } from './cli'
export type { CliCommand, CliEnvironment } from './cli'
