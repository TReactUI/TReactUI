/** A positional argument of a command. */
export interface ArgumentSpec {
  name:          string
  description?:  string
  required:      boolean
  /** Takes any number of values. */
  variadic:      boolean
  defaultValue?: string
  choices?:      string[]
}

/** A flag of a command. */
export interface OptionSpec {
  /** The long form, with its dashes: `--shout`. Falls back to the short form when there is no long one. */
  flag:          string
  short?:        string
  description?:  string
  /** False for an on/off switch. */
  takesValue:    boolean
  /** How the value is called in help, for instance `file`. */
  valueName?:    string
  defaultValue?: string
  choices?:      string[]
  /** The command refuses to run without it. */
  required:      boolean
}

/** One runnable command, such as a leaf of a commander program. */
export interface CommandSpec {
  /** What the user types: `greet`, or `remote add` for a nested command. */
  name:         string
  description?: string
  arguments:    ArgumentSpec[]
  options:      OptionSpec[]
}
