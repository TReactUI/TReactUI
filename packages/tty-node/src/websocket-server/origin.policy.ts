export interface OriginCheck {
  /** The request's Origin header, if any. */
  origin:         string | undefined
  /** The request's Host header: where the page and this server were reached. */
  host:           string | undefined
  /** Extra pages allowed to connect: a host (`localhost:4200`) or a full origin (`http://localhost:4200`). */
  allowedOrigins: readonly string[]
}

/**
 * Whether a page may open the terminal. The endpoint runs programs, so a
 * foreign web page must not be able to reach it through the visitor's browser
 * (cross-site WebSocket hijacking). Only the page served from the same host,
 * or one explicitly listed, is let in. A request with no Origin did not come
 * from a browser page, so the attack does not apply to it.
 */
export function isOriginAllowed ({ origin, host, allowedOrigins }: OriginCheck): boolean {
  if (origin === undefined) return true

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  return originHost === host || allowedOrigins.includes(origin) || allowedOrigins.includes(originHost)
}
