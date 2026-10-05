import type { CommandSpec } from '@treactui/protocol'
import { argumentFieldId, optionFieldId } from './command-form.contract'
import type { CommandFormErrors, CommandFormValues } from './command-form.contract'

/** Says what stops the form from being run; an empty result means it can be. */
export function validateCommandForm (command: CommandSpec, values: CommandFormValues): CommandFormErrors {
  const errors: CommandFormErrors = {}

  let skipped: string | undefined
  for (const argument of command.arguments) {
    const filled = (values.args[argument.name] ?? '').trim() !== ''
    if (!filled && argument.required) {
      errors[argumentFieldId(argument.name)] = `${argument.name} is required`
    } else if (!filled) {
      skipped ??= argument.name
    } else if (skipped !== undefined) {
      errors[argumentFieldId(skipped)] = `${skipped} must be filled in before ${argument.name}, because arguments are matched by position`
    }
  }

  for (const option of command.options) {
    const value = values.options[option.flag]
    if (option.required && option.takesValue && (typeof value !== 'string' || value.trim() === '')) {
      errors[optionFieldId(option.flag)] = `${option.flag} is required`
    }
  }

  return errors
}
