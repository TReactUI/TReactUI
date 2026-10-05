import { parseCommandCatalog } from './parse-command-catalog.validator'

describe('parseCommandCatalog', () => {
  it('reads a well-formed catalog', () => {
    const catalog = [{
      name:        'greet',
      description: 'Print a greeting',
      arguments:   [{ name: 'name', required: true, variadic: false }],
      options:     [{ flag: '--shout', short: '-s', takesValue: false, required: false }],
    }]

    expect(parseCommandCatalog(catalog)).toEqual([{
      name:        'greet',
      description: 'Print a greeting',
      arguments:   [{ name: 'name', description: undefined, required: true, variadic: false, defaultValue: undefined, choices: undefined }],
      options:     [{ flag: '--shout', short: '-s', description: undefined, takesValue: false, valueName: undefined, defaultValue: undefined, choices: undefined, required: false }],
    }])
  })

  it.each([
    ['not a list', { name: 'x' }],
    ['a command without a name', [{ arguments: [], options: [] }]],
    ['a command without its lists', [{ name: 'x' }]],
    ['an argument that is not an object', [{ name: 'x', arguments: ['y'], options: [] }]],
    ['an option without a flag', [{ name: 'x', arguments: [], options: [{ takesValue: true }] }]],
  ])('rejects %s', (_label, value) => {
    expect(parseCommandCatalog(value)).toBeUndefined()
  })
})
