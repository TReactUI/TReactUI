import type { ClientMessage } from './client-message.contract'

/** Serialises a message into the text frame sent over the socket. */
export function encodeClientMessage (message: ClientMessage): string {
  return JSON.stringify(message)
}
