export interface Sequencer<T> {
  /** Takes an item with its number and returns the items now ready, in order. */
  push: (seq: number, item: T) => T[]
}

/**
 * Puts items back in the order of their numbers, counted from 0: an item that arrives before an
 * earlier one is held until the earlier one comes. A host may deliver events out of order.
 */
export function createSequencer<T> (): Sequencer<T> {
  let next = 0
  const held = new Map<number, T>()

  return {
    push (seq, item) {
      // A repeat of one already handed out.
      if (seq < next) return []
      held.set(seq, item)
      const ready: T[] = []
      while (held.has(next)) {
        ready.push(held.get(next) as T)
        held.delete(next)
        next += 1
      }

      return ready
    },
  }
}
