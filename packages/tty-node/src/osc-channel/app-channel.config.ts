/**
 * An application running in a terminal cannot call the adapter, so it writes
 * ServerMessage JSON inside a private-use OSC sequence on its own output:
 * `ESC ] 7770 ; <json> BEL`. The adapter strips it before the text reaches the
 * browser. Any language can do this; a normal terminal ignores unknown OSC codes.
 */
export const APP_CHANNEL_START = '\u{1B}]7770;'

export const APP_CHANNEL_BEL = '\u{7}'
export const APP_CHANNEL_ST = '\u{1B}\\'

/** Set to "1" in the environment of a program the adapter runs. */
export const APP_CHANNEL_ENV = 'TREACT_TTY'

/** A message larger than this is not a snapshot; the text is passed through instead of buffered forever. */
export const APP_CHANNEL_MAX_LENGTH = 1_000_000
