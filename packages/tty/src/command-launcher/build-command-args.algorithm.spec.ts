import type { CommandSpec } from '@treactui/protocol'
import { buildCommandArgs } from './build-command-args.algorithm'

const greet: CommandSpec = {
  name:      'greet',
  arguments: [
    { name: 'name', required: true, variadic: false },
    { name: 'more', required: false, variadic: true },
  ],
  options: [
    { flag: '--shout', short: '-s', takesValue: false, required: false },
    { flag: '--file', takesValue: true, valueName: 'path', required: false },
  ],
}

describe('buildCommandArgs', () => {
  it('puts the switches and valued options first, then the positional arguments', () => {
    const args = buildCommandArgs(greet, { args: { name: 'Ada', more: '  Grace   Linus ' }, options: { '--shout': true, '--file': 'names.txt' } })

    expect(args).toEqual(['--shout', '--file', 'names.txt', 'Ada', 'Grace', 'Linus'])
  })

  it('leaves out an unchecked switch, an empty option and an empty argument', () => {
    const args = buildCommandArgs(greet, { args: { name: 'Ada', more: '' }, options: { '--shout': false, '--file': '' } })

    expect(args).toEqual(['Ada'])
  })

  it('keeps a value with spaces as one argument', () => {
    expect(buildCommandArgs(greet, { args: { name: 'Ada Lovelace' }, options: {} })).toEqual(['Ada Lovelace'])
  })

  it('ends option parsing before a positional that starts with a dash, so typed text is never an option', () => {
    const args = buildCommandArgs(greet, { args: { name: '--shout' }, options: { '--file': 'f' } })

    expect(args).toEqual(['--file', 'f', '--', '--shout'])
  })
})
