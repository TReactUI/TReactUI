import type { ArgumentSpec, CommandSpec, OptionSpec } from '@treactui/protocol'

/**
 * The parts of a commander `Command` the catalog reads. Structural, so this
 * package does not depend on commander and any compatible major version works.
 */
export interface CommanderCommandLike {
  name:                () => string
  description:         () => string
  commands:            readonly CommanderCommandLike[]
  registeredArguments: ReadonlyArray<{
    name:          () => string
    description:   string
    required:      boolean
    variadic:      boolean
    defaultValue?: unknown
    argChoices?:   readonly string[]
  }>
  options: ReadonlyArray<{
    short?:        string
    long?:         string
    flags:         string
    description:   string
    required:      boolean
    mandatory:     boolean
    negate:        boolean
    hidden:        boolean
    defaultValue?: unknown
    argChoices?:   readonly string[]
    isBoolean:     () => boolean
  }>
}

const VALUE_NAME = /[<[]([^>\]]+?)(?:\.\.\.)?[>\]]/

const text = (value: unknown): string | undefined =>
  [undefined, null, ''].includes(value as string | null | undefined) ? undefined : String(value)

function describeArgument (argument: CommanderCommandLike['registeredArguments'][number]): ArgumentSpec {
  return {
    name:         argument.name(),
    description:  text(argument.description),
    required:     argument.required,
    variadic:     argument.variadic,
    defaultValue: text(argument.defaultValue),
    choices:      argument.argChoices === undefined ? undefined : [...argument.argChoices],
  }
}

function describeOption (option: CommanderCommandLike['options'][number]): OptionSpec {
  const takesValue = !option.isBoolean() && !option.negate

  return {
    flag:         option.long ?? option.short ?? option.flags,
    short:        option.long === undefined ? undefined : option.short,
    description:  text(option.description),
    takesValue,
    valueName:    takesValue ? VALUE_NAME.exec(option.flags)?.[1] : undefined,
    defaultValue: option.defaultValue === undefined || typeof option.defaultValue === 'boolean' ? undefined : text(option.defaultValue),
    choices:      option.argChoices === undefined ? undefined : [...option.argChoices],
    required:     option.mandatory,
  }
}

function describeCommand (command: CommanderCommandLike, path: string[]): CommandSpec[] {
  const name = [...path, command.name()]
  if (command.commands.length > 0) return command.commands.flatMap(child => describeCommand(child, name))

  return [{
    name:        name.join(' '),
    description: text(command.description()),
    arguments:   command.registeredArguments.map(argument => describeArgument(argument)),
    options:     command.options.filter(option => !option.hidden).map(option => describeOption(option)),
  }]
}

/**
 * Lists the runnable commands of a commander program: its leaves, with a nested
 * command named by its path (`remote add`). The program itself is not a command.
 */
export function describeCommanderProgram (program: CommanderCommandLike): CommandSpec[] {
  return program.commands.flatMap(command => describeCommand(command, []))
}
