import type { Politeness } from '@treactui/protocol'

export interface Announcement {
  text:       string
  politeness: Politeness
}

export interface AnnouncementLimiter {
  /** Offers an announcement: spoken at once if none was spoken just now, otherwise held and possibly replaced. */
  offer:   (announcement: Announcement) => void
  /** Drops what is held and stops the timer. */
  dispose: () => void
}

/** No more than about two and a half announcements a second reach the live region (see {@link createAnnouncementLimiter}). */
export const ANNOUNCEMENT_INTERVAL_MS = 400

/**
 * Keeps announcements to a pace a person can follow. A program that announces in a loop, or a list that is
 * scrolled through quickly, would otherwise queue hundreds of utterances in a screen reader, which keeps
 * speaking long after the events: measured at 200 announcements a second, the live region changed about 120
 * times a second.
 *
 * The first announcement is delivered at once. Anything offered within the next `intervalMs` is held, and only
 * the latest is delivered when that time is up (an assertive one is not displaced by a polite one that comes
 * later), which starts another interval. When nothing is held at the end of an interval the limiter is idle again
 * and the next announcement is immediate.
 */
export function createAnnouncementLimiter (deliver: (announcement: Announcement) => void, intervalMs = ANNOUNCEMENT_INTERVAL_MS): AnnouncementLimiter {
  let timer: ReturnType<typeof setTimeout> | undefined
  let held: Announcement | undefined

  const startInterval = (): void => {
    timer = setTimeout(() => {
      timer = undefined
      if (held === undefined) return
      const next = held
      held = undefined
      deliver(next)
      startInterval()
    }, intervalMs)
  }

  return {
    offer (announcement) {
      if (timer === undefined) {
        deliver(announcement)
        startInterval()

        return
      }
      if (held?.politeness === 'assertive' && announcement.politeness !== 'assertive') return
      held = announcement
    },
    dispose () {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      held = undefined
    },
  }
}
