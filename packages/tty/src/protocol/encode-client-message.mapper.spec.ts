import { encodeClientMessage } from './encode-client-message.mapper'

describe('encodeClientMessage', () => {
  it('serialises a resize message', () => {
    expect(JSON.parse(encodeClientMessage({ type: 'resize', cols: 80, rows: 24 }))).toEqual({ type: 'resize', cols: 80, rows: 24 })
  })
})
