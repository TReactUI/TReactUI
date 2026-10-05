import { isOriginAllowed } from './origin.policy'

const check = (origin: string | undefined, allowedOrigins: string[] = []) =>
  isOriginAllowed({ origin, host: 'localhost:8080', allowedOrigins })

describe('isOriginAllowed', () => {
  it('lets in the page served from the same host', () => {
    expect(check('http://localhost:8080')).toBe(true)
  })

  it('lets in a request with no Origin, which is not a browser page', () => {
    expect(check(undefined)).toBe(true)
  })

  it('lets in an explicitly listed page, as a host or as a full origin', () => {
    expect(check('http://localhost:4200', ['localhost:4200'])).toBe(true)
    expect(check('http://localhost:4200', ['http://localhost:4200'])).toBe(true)
  })

  it('keeps out a foreign page and a malformed Origin', () => {
    expect(check('https://evil.example')).toBe(false)
    expect(check('http://localhost:4200')).toBe(false)
    expect(check('not a url')).toBe(false)
  })
})
