import { parseCliArguments } from './parse-cli-arguments.algorithm'

describe('parseCliArguments', () => {
  it.each([[[]], [['--help']], [['-h']], [['help']], [['serve', '--help']]])('asks for help for %j', argv => {
    expect(parseCliArguments(argv)).toEqual({ kind: 'help' })
  })

  it.each([[['--version']], [['-v']]])('asks for the version for %j', argv => {
    expect(parseCliArguments(argv)).toEqual({ kind: 'version' })
  })

  it('serves the program after --, with its arguments, untouched', () => {
    expect(parseCliArguments(['serve', '--', 'python', 'app.py', '--port', '9']))
      .toMatchObject({ kind: 'serve', options: { command: 'python', args: ['app.py', '--port', '9'] } })
  })

  it('reads every option before the program', () => {
    expect(parseCliArguments(['serve', '--port', '0', '--host', '::1', '--path', '/x', '--origin', 'a:1', '--origin', 'b:2', '--cwd', 'work', '--', 'prog']))
      .toEqual({
        kind:    'serve',
        options: { command: 'prog', args: [], port: 0, host: '::1', path: '/x', cwd: 'work', allowedOrigins: ['a:1', 'b:2'] },
      })
  })

  it('lets the first word that is not an option start the program', () => {
    expect(parseCliArguments(['serve', '--port', '9000', 'node', 'cli.js', '--flag']))
      .toMatchObject({ kind: 'serve', options: { command: 'node', args: ['cli.js', '--flag'], port: 9000 } })
  })

  it('leaves options unset when not given, so the server defaults apply', () => {
    expect(parseCliArguments(['serve', '--', 'prog']))
      .toEqual({ kind: 'serve', options: { command: 'prog', args: [], allowedOrigins: [] } })
    expect(parseCliArguments(['serve', '--', 'prog'])).not.toHaveProperty('options.port')
  })

  it.each([
    [['nope'], 'unknown command "nope"'],
    [['serve'], 'no program to serve'],
    [['serve', '--'], 'no program to serve'],
    [['serve', '--port', 'abc', '--', 'p'], '--port must be'],
    [['serve', '--port', '-1', '--', 'p'], '--port must be'],
    [['serve', '--port', '65536', '--', 'p'], '--port must be'],
    [['serve', '--port', '1.5', '--', 'p'], '--port must be'],
    [['serve', '--port'], '--port needs a value'],
    [['serve', '--port', '--', 'p'], '--port needs a value'],
    [['serve', '--path', 'term', '--', 'p'], '--path must start with'],
    [['serve', '--bogus', 'x', '--', 'p'], 'unknown option "--bogus"'],
  ])('rejects %j', (argv, message) => {
    const parsed = parseCliArguments(argv)

    expect(parsed.kind).toBe('error')
    expect(parsed).toMatchObject({ message: expect.stringContaining(message) })
  })
})
