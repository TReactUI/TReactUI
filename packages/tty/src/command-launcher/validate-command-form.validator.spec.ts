import type { CommandSpec } from '@trectui/protocol'
import { validateCommandForm } from './validate-command-form.validator'

const command: CommandSpec = {
  name:      'copy',
  arguments: [
    { name: 'from', required: true, variadic: false },
    { name: 'mode', required: false, variadic: false },
    { name: 'to', required: false, variadic: false },
  ],
  options: [{ flag: '--token', takesValue: true, required: true }],
}

describe('validateCommandForm', () => {
  it('accepts a form with its required fields filled', () => {
    expect(validateCommandForm(command, { args: { from: 'a' }, options: { '--token': 't' } })).toEqual({})
  })

  it('names each missing required argument and option', () => {
    expect(validateCommandForm(command, { args: {}, options: {} })).toEqual({
      'arg:from':    'from is required',
      'opt:--token': '--token is required',
    })
  })

  it('treats blank text as missing', () => {
    expect(validateCommandForm(command, { args: { from: ' '.repeat(3) }, options: { '--token': ' ' } })).toMatchObject({ 'arg:from': 'from is required' })
  })

  it('refuses to skip an optional argument that a later one depends on', () => {
    const errors = validateCommandForm(command, { args: { from: 'a', to: 'b' }, options: { '--token': 't' } })

    expect(errors).toEqual({ 'arg:mode': 'mode must be filled in before to, because arguments are matched by position' })
  })
})
