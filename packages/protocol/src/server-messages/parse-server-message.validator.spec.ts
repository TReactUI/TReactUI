import { parseServerMessage } from './parse-server-message.validator'

describe('parseServerMessage', () => {
  it('accepts an output frame', () => {
    expect(parseServerMessage('{"type":"output","data":"hi"}')).toEqual({
      ok: true, message: { type: 'output', data: 'hi' },
    })
  })

  it('defaults an announcement to polite', () => {
    expect(parseServerMessage('{"type":"announce","text":"Done"}')).toEqual({
      ok: true, message: { type: 'announce', text: 'Done', politeness: 'polite' },
    })
  })

  it('rejects a snapshot without nodes', () => {
    expect(parseServerMessage('{"type":"a11y-snapshot","snapshot":{"title":"x"}}').ok).toBe(false)
  })

  it('rejects invalid JSON and unknown types with a reason', () => {
    expect(parseServerMessage('nope')).toEqual({ ok: false, reason: 'frame is not valid JSON' })
    expect(parseServerMessage('{"type":"zap"}')).toEqual({ ok: false, reason: 'unknown message type "zap"' })
  })

  it('accepts a command list and rejects a malformed one', () => {
    const commands = [{ name: 'greet', arguments: [], options: [] }]
    const parsed = parseServerMessage(JSON.stringify({ type: 'commands', commands }))

    expect(parsed.ok && parsed.message.type === 'commands' && parsed.message.commands[0]?.name).toBe('greet')
    expect(parseServerMessage('{"type":"commands","commands":[{"arguments":[]}]}').ok).toBe(false)
  })
})
