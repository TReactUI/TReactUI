/**
 * After a scroll, whether the terminal had to throw away its oldest line: the buffer was already full
 * (its scrollback plus the visible rows) and still did not grow. Counting these gives exactly the number
 * of lines the terminal no longer holds.
 */
export function lostAnOldLine (lengthBefore: number, lengthAfter: number, capacity: number): boolean {
  return lengthBefore >= capacity && lengthAfter >= capacity
}
