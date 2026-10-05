import type { ArgumentSpec, CommandSpec, OptionSpec } from './command-catalog.contract'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const optionalString = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined

const optionalStrings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined

function parseArgument (value: unknown): ArgumentSpec | undefined {
  if (!isRecord(value) || typeof value['name'] !== 'string') return undefined

  return {
    name:         value['name'],
    description:  optionalString(value['description']),
    required:     value['required'] === true,
    variadic:     value['variadic'] === true,
    defaultValue: optionalString(value['defaultValue']),
    choices:      optionalStrings(value['choices']),
  }
}

function parseOption (value: unknown): OptionSpec | undefined {
  if (!isRecord(value) || typeof value['flag'] !== 'string') return undefined

  return {
    flag:         value['flag'],
    short:        optionalString(value['short']),
    description:  optionalString(value['description']),
    takesValue:   value['takesValue'] === true,
    valueName:    optionalString(value['valueName']),
    defaultValue: optionalString(value['defaultValue']),
    choices:      optionalStrings(value['choices']),
    required:     value['required'] === true,
  }
}

function parseList<T> (value: unknown, parseItem: (item: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.map(item => parseItem(item))

  return items.every(item => item !== undefined) ? items : undefined
}

function parseCommand (value: unknown): CommandSpec | undefined {
  if (!isRecord(value) || typeof value['name'] !== 'string') return undefined
  const args = parseList(value['arguments'], parseArgument)
  const options = parseList(value['options'], parseOption)
  if (args === undefined || options === undefined) return undefined

  return { name: value['name'], description: optionalString(value['description']), arguments: args, options }
}

/** Reads a command list from an untrusted value; undefined unless every command is well formed. */
export function parseCommandCatalog (value: unknown): CommandSpec[] | undefined {
  return parseList(value, parseCommand)
}
