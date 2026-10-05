import { APP_CHANNEL_BEL, APP_CHANNEL_MAX_LENGTH, APP_CHANNEL_ST, APP_CHANNEL_START } from './app-channel.config'

export interface ExtractedChunk {
  /** The terminal text, with every application message removed. */
  output:   string
  /** The payload of each complete application message, in order. */
  messages: string[]
}

export interface AppMessageExtractor {
  push: (chunk: string) => ExtractedChunk
}

/** How many characters at the end of `text` could be the start of the opening sequence. */
function partialStartLength (text: string): number {
  for (let length = Math.min(APP_CHANNEL_START.length - 1, text.length); length > 0; length--) {
    if (text.endsWith(APP_CHANNEL_START.slice(0, length))) return length
  }

  return 0
}

/**
 * Splits program output into terminal text and application messages. It is a
 * store because a message may be cut across chunks, so the unfinished tail is
 * kept until the next push.
 */
export function createAppMessageExtractor (): AppMessageExtractor {
  let pending = ''

  return {
    push (chunk) {
      let text = pending + chunk
      pending = ''
      let output = ''
      const messages: string[] = []

      for (;;) {
        const start = text.indexOf(APP_CHANNEL_START)
        if (start === -1) {
          const keep = partialStartLength(text)
          output += text.slice(0, text.length - keep)
          pending = text.slice(text.length - keep)
          break
        }

        output += text.slice(0, start)
        const body = text.slice(start + APP_CHANNEL_START.length)
        const bel = body.indexOf(APP_CHANNEL_BEL)
        const st = body.indexOf(APP_CHANNEL_ST)
        const useBel = bel !== -1 && (st === -1 || bel < st)
        const end = useBel ? bel : st

        if (end === -1) {
          if (body.length > APP_CHANNEL_MAX_LENGTH) {
            output += APP_CHANNEL_START + body
          } else {
            pending = text.slice(start)
          }
          break
        }

        messages.push(body.slice(0, end))
        text = body.slice(end + (useBel ? APP_CHANNEL_BEL.length : APP_CHANNEL_ST.length))
      }

      return { output, messages }
    },
  }
}
