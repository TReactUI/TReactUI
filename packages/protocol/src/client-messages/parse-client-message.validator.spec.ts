import { encodeClientMessage } from './encode-client-message.mapper'
import { parseClientMessage } from './parse-client-message.validator'

describe('parseClientMessage', () => {
  it('accepts what the browser side encodes', () => {
    const frame = encodeClientMessage({ type: 'resize', cols: 80, rows: 24 })

    expect(parseClientMessage(frame)).toEqual({ ok: true, message: { type: 'resize', cols: 80, rows: 24 } })
    expect(parseClientMessage('{"type":"input","data":"a"}')).toEqual({ ok: true, message: { type: 'input', data: 'a' } })
  })

  it.each([
    ['{"type":"resize","cols":0,"rows":24}'],
    ['{"type":"resize","cols":80.5,"rows":24}'],
    ['{"type":"resize","cols":100000,"rows":24}'],
    ['{"type":"resize","cols":"80","rows":24}'],
  ])('rejects an implausible size: %s', frame => {
    expect(parseClientMessage(frame).ok).toBe(false)
  })

  it('rejects invalid JSON, a missing type, bad input and unknown types with a reason', () => {
    expect(parseClientMessage('nope')).toEqual({ ok: false, reason: 'frame is not valid JSON' })
    expect(parseClientMessage('[]')).toEqual({ ok: false, reason: 'frame has no message type' })
    expect(parseClientMessage('{"type":"input"}')).toEqual({ ok: false, reason: 'input needs string data' })
    expect(parseClientMessage('{"type":"zap"}')).toEqual({ ok: false, reason: 'unknown message type "zap"' })
  })

  it('accepts a run message and a stop message', () => {
    expect(parseClientMessage('{"type":"run","command":"greet","args":["Ada","--shout"]}')).toEqual({
      ok: true, message: { type: 'run', command: 'greet', args: ['Ada', '--shout'] },
    })
    expect(parseClientMessage('{"type":"stop"}')).toEqual({ ok: true, message: { type: 'stop' } })
  })

  it.each([
    ['no command', '{"type":"run","args":[]}'],
    ['an empty command', '{"type":"run","command":"","args":[]}'],
    ['args that are not a list', '{"type":"run","command":"x","args":"y"}'],
    ['a non-string argument', '{"type":"run","command":"x","args":[1]}'],
    ['a NUL in an argument', JSON.stringify({ type: 'run', command: 'x', args: [`a${String.fromCodePoint(0)}b`] })],
    ['too many arguments', JSON.stringify({ type: 'run', command: 'x', args: Array.from({ length: 101 }, () => 'a') })],
    ['an enormous argument', JSON.stringify({ type: 'run', command: 'x', args: ['a'.repeat(10_001)] })],
  ])('rejects a run message with %s', (_label, frame) => {
    expect(parseClientMessage(frame).ok).toBe(false)
  })
})
