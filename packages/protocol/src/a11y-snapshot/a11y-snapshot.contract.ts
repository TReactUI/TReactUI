/** The ARIA roles a backend may describe. Deliberately small: each maps to one native element pattern. */
export type A11yRole =
  | 'heading' |
  'list' |
  'listitem' |
  'listbox' |
  'option' |
  'button' |
  'textbox' |
  'progressbar' |
  'status' |
  'text'

/** One element of the semantic description of a screen. */
export interface A11yNode {
  role:      A11yRole
  label?:    string
  /** Text value, e.g. what a textbox currently holds. */
  value?:    string
  /** Progress, as a percentage, for a `progressbar`. */
  valueNow?: number
  selected?: boolean
  focused?:  boolean
  children?: A11yNode[]
}

/** What the TUI currently shows, described for assistive technology. */
export interface A11ySnapshot {
  title: string
  nodes: A11yNode[]
}
