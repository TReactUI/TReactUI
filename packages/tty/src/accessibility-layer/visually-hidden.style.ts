import type { CSSProperties } from 'react'

/** Removes an element from view but keeps it in the accessibility tree. */
export const visuallyHidden: CSSProperties = {
  position:   'absolute',
  width:      1,
  height:     1,
  margin:     -1,
  padding:    0,
  border:     0,
  overflow:   'hidden',
  clip:       'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
}
