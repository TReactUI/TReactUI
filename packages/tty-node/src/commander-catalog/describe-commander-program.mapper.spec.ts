import { Command, Option } from 'commander'
import { describeCommanderProgram } from './describe-commander-program.mapper'

function sampleProgram (): Command {
  const program = new Command().name('tasks')
  program
    .command('greet')
    .description('Print a greeting')
    .argument('<name>', 'who to greet')
    .argument('[extra...]', 'more people')
    .option('-s, --shout', 'greet loudly')
    .option('-f, --file <path>', 'read names from a file')
    .option('--no-color', 'plain output')
    .addOption(new Option('--mode <mode>', 'how').choices(['a', 'b']).default('a'))
    .addOption(new Option('--secret').hideHelp())
    .requiredOption('--token <value>', 'api token')
  const remote = program.command('remote').description('manage remotes')
  remote.command('add').argument('<url>').action(() => {})

  return program
}

describe('describeCommanderProgram', () => {
  it('describes a command with its arguments and options', () => {
    const [greet] = describeCommanderProgram(sampleProgram())

    expect(greet).toMatchObject({ name: 'greet', description: 'Print a greeting' })
    expect(greet?.arguments).toEqual([
      { name: 'name', description: 'who to greet', required: true, variadic: false, defaultValue: undefined, choices: undefined },
      { name: 'extra', description: 'more people', required: false, variadic: true, defaultValue: undefined, choices: undefined },
    ])
    expect(greet?.options.map(option => option.flag)).toEqual(['--shout', '--file', '--no-color', '--mode', '--token'])
  })

  it('tells switches from options that take a value, and reads choices, defaults and required', () => {
    const [greet] = describeCommanderProgram(sampleProgram())
    const byFlag = Object.fromEntries((greet?.options ?? []).map(option => [option.flag, option]))

    expect(byFlag['--shout']).toMatchObject({ short: '-s', takesValue: false })
    expect(byFlag['--no-color']).toMatchObject({ takesValue: false })
    expect(byFlag['--file']).toMatchObject({ takesValue: true, valueName: 'path' })
    expect(byFlag['--mode']).toMatchObject({ takesValue: true, choices: ['a', 'b'], defaultValue: 'a' })
    expect(byFlag['--token']).toMatchObject({ required: true })
  })

  it('leaves out hidden options and names a nested command by its path', () => {
    const commands = describeCommanderProgram(sampleProgram())

    expect(commands.flatMap(command => command.options.map(option => option.flag))).not.toContain('--secret')
    expect(commands.map(command => command.name)).toEqual(['greet', 'remote add'])
  })
})
