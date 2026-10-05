export interface KeyChord {
  key:      string
  ctrlKey:  boolean
  shiftKey: boolean
  altKey:   boolean
}

/**
 * A terminal swallows Tab and most keys, which traps keyboard users inside it.
 * Ctrl+Shift+M is the documented way out: it hands focus back to the page.
 */
export function isFocusEscapeChord (chord: KeyChord): boolean {
  return chord.ctrlKey && chord.shiftKey && !chord.altKey && chord.key.toLowerCase() === 'm'
}
