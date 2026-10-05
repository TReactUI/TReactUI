import type { CommandSpec } from '@trectui/protocol'
import { useEffect, useId, useRef, useState } from 'react'
import { ArgumentField } from './argument-field.component'
import { buildCommandArgs } from './build-command-args.algorithm'
import { argumentFieldId, optionFieldId } from './command-form.contract'
import type { CommandFormErrors, CommandFormValues } from './command-form.contract'
import { OptionField } from './option-field.component'
import { validateCommandForm } from './validate-command-form.validator'

export interface CommandLauncherProps {
  commands: CommandSpec[]
  onRun:    (command: string, args: string[]) => void
}

const emptyValues = (): CommandFormValues => ({ args: {}, options: {} })

/**
 * An accessible form to pick one of the backend's commands, fill in its
 * arguments and options, and run it. Every field has a label and, when it
 * is wrong, an error tied to it; the first wrong field takes focus on submit.
 */
export function CommandLauncher ({ commands, onRun }: CommandLauncherProps) {
  const formId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [selected, setSelected] = useState(commands[0]?.name ?? '')
  const [values, setValues] = useState<CommandFormValues>(emptyValues)
  const [errors, setErrors] = useState<CommandFormErrors>({})
  const [submitCount, setSubmitCount] = useState(0)

  // Arriving here is a change of screen, so say so: focus the heading.
  useEffect(() => headingRef.current?.focus(), [])
  // After a failed submit, once the wrong fields are marked invalid, focus the first one.
  useEffect(() => {
    if (submitCount > 0 && Object.keys(errors).length > 0) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    }
  }, [submitCount, errors])

  const command = commands.find(candidate => candidate.name === selected)

  if (command === undefined) return <p>No commands are available.</p>

  const fieldId = (id: string): string => `${formId}-${id.replaceAll(/[^\w-]/g, '_')}`

  const select = (name: string): void => {
    setSelected(name)
    setValues(emptyValues())
    setErrors({})
  }

  const submit = (event: { preventDefault: () => void }): void => {
    event.preventDefault()
    const found = validateCommandForm(command, values)
    setErrors(found)
    setSubmitCount(count => count + 1)
    if (Object.keys(found).length === 0) onRun(command.name, buildCommandArgs(command, values))
  }

  const errorList = Object.values(errors)

  return (
    <form ref={formRef} onSubmit={submit} aria-labelledby={`${formId}-heading`} noValidate style={{ padding: 16 }}>
      <h2 id={`${formId}-heading`} ref={headingRef} tabIndex={-1}>Run a command</h2>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor={`${formId}-command`}>Command</label>
        <br />
        <select
          id={`${formId}-command`}
          value={selected}
          aria-describedby={command.description === undefined ? undefined : `${formId}-command-description`}
          onChange={event => select(event.target.value)}
        >
          {commands.map(candidate => <option key={candidate.name} value={candidate.name}>{candidate.name}</option>)}
        </select>
        {command.description !== undefined && <div id={`${formId}-command-description`}>{command.description}</div>}
      </div>

      {errorList.length > 0 && (
        <div role='alert' style={{ color: '#b00020', marginBottom: 12 }}>
          {errorList.length === 1 ? 'There is 1 problem:' : `There are ${errorList.length} problems:`}
          <ul>{errorList.map(message => <li key={message}>{message}</li>)}</ul>
        </div>
      )}

      {command.arguments.length > 0 && (
        <fieldset style={{ marginBottom: 12 }}>
          <legend>Arguments</legend>
          {command.arguments.map(argument => (
            <ArgumentField
              key={argument.name}
              id={fieldId(argumentFieldId(argument.name))}
              spec={argument}
              value={values.args[argument.name] ?? ''}
              error={errors[argumentFieldId(argument.name)]}
              onChange={value => setValues(current => ({ ...current, args: { ...current.args, [argument.name]: value } }))}
            />
          ))}
        </fieldset>
      )}

      {command.options.length > 0 && (
        <fieldset style={{ marginBottom: 12 }}>
          <legend>Options</legend>
          {command.options.map(option => (
            <OptionField
              key={option.flag}
              id={fieldId(optionFieldId(option.flag))}
              spec={option}
              value={values.options[option.flag]}
              error={errors[optionFieldId(option.flag)]}
              onChange={value => setValues(current => ({ ...current, options: { ...current.options, [option.flag]: value } }))}
            />
          ))}
        </fieldset>
      )}

      <button type='submit'>Run</button>
    </form>
  )
}
