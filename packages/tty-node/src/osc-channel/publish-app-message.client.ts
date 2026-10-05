import type { A11ySnapshot, Politeness, ServerMessage } from '@trectui/protocol'
import { APP_CHANNEL_BEL, APP_CHANNEL_ENV, APP_CHANNEL_START } from './app-channel.config'

export interface AppChannelOutput {
  write: (text: string) => unknown
}

/** True when the program runs under the adapter, which sets the environment variable. */
export function isRunningUnderTty (env: NodeJS.ProcessEnv = process.env): boolean {
  return env[APP_CHANNEL_ENV] === '1'
}

/**
 * Sends a message to the browser from inside the program being served. Outside
 * the adapter it does nothing, so the same program still works in a real terminal.
 */
export function publishAppMessage (
  message: Exclude<ServerMessage, { type: 'output' | 'hello' }>,
  output: AppChannelOutput = process.stdout,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!isRunningUnderTty(env)) return
  output.write(APP_CHANNEL_START + JSON.stringify(message) + APP_CHANNEL_BEL)
}

/** Makes screen readers read `text` aloud. */
export function announce (text: string, politeness: Politeness = 'polite', output?: AppChannelOutput, env?: NodeJS.ProcessEnv): void {
  publishAppMessage({ type: 'announce', text, politeness }, output, env)
}

/** Describes the current screen for assistive technology. */
export function publishSnapshot (snapshot: A11ySnapshot, output?: AppChannelOutput, env?: NodeJS.ProcessEnv): void {
  publishAppMessage({ type: 'a11y-snapshot', snapshot }, output, env)
}
