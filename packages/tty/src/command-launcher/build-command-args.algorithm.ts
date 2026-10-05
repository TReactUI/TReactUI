import type { CommandSpec } from '@treactui/protocol'
import type { CommandFormValues } from './command-form.contract'

/**
 * Turns a filled-in form into the argument list that follows the command name:
 * options first, then positional arguments. Positionals follow a `--` when any
 * of them starts with a dash, so typed text can never be read as an option.
 */
export function buildCommandArgs (command: CommandSpec, values: CommandFormValues): string[] {
  const options: string[] = []
  for (const option of command.options) {
    const value = values.options[option.flag]
    if (!option.takesValue) {
      if (value === true) options.push(option.flag)
    } else if (typeof value === 'string' && value !== '') {
      options.push(option.flag, value)
    }
  }

  const positionals: string[] = []
  for (const argument of command.arguments) {
    const value = values.args[argument.name] ?? ''
    if (argument.variadic) positionals.push(...value.split(/\s+/).filter(part => part !== ''))
    else if (value !== '') positionals.push(value)
  }

  const needsSeparator = positionals.some(positional => positional.startsWith('-'))

  return [...options, ...(needsSeparator ? ['--'] : []), ...positionals]
}
