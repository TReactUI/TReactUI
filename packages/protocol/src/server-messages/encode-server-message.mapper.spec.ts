import { encodeServerMessage } from './encode-server-message.mapper'
import { parseServerMessage } from './parse-server-message.validator'

describe('encodeServerMessage', () => {
  it('produces a frame the browser side accepts', () => {
    const frame = encodeServerMessage({ type: 'announce', text: 'Done', politeness: 'assertive' })

    expect(parseServerMessage(frame)).toEqual({ ok: true, message: { type: 'announce', text: 'Done', politeness: 'assertive' } })
  })
})
