/** What the user has typed into a command's form. */
export interface CommandFormValues {
  /** Keyed by argument name. A variadic argument is one string, split on whitespace when run. */
  args:    Record<string, string>
  /** Keyed by option flag. A switch is a boolean; an option that takes a value is a string. */
  options: Record<string, string | boolean>
}

/** Messages keyed by field id (see `argumentFieldId` and `optionFieldId`). */
export type CommandFormErrors = Record<string, string>

export const argumentFieldId = (name: string): string => `arg:${name}`
export const optionFieldId = (flag: string): string => `opt:${flag}`
