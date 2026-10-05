import type { ServerMessage } from './server-message.contract'

/** Serialises a message into the text frame sent over the socket. */
export function encodeServerMessage (message: ServerMessage): string {
  return JSON.stringify(message)
}
