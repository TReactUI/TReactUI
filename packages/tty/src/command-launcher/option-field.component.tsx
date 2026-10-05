import type { OptionSpec } from '@trectui/protocol'

export interface OptionFieldProps {
  id:       string
  spec:     OptionSpec
  value:    string | boolean | undefined
  error:    string | undefined
  onChange: (value: string | boolean) => void
}

/** One option: a checkbox for a switch, otherwise a labelled text field, or a select when the command lists its choices. */
export function OptionField ({ id, spec, value, error, onChange }: OptionFieldProps) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const flagName = spec.short === undefined ? spec.flag : `${spec.flag}, ${spec.short}`
  const hint = [spec.description, spec.defaultValue === undefined ? undefined : `Default: ${spec.defaultValue}.`].filter(Boolean).join(' ')
  const describedBy = [hint === '' ? undefined : hintId, error === undefined ? undefined : errorId].filter(Boolean).join(' ') || undefined

  if (!spec.takesValue) {
    return (
      <div style={{ marginBottom: 12 }}>
        <label htmlFor={id}>
          <input id={id} type='checkbox' checked={value === true} aria-describedby={describedBy} onChange={event => onChange(event.target.checked)} />
          {' '}
          {flagName}
        </label>
        {hint !== '' && <div id={hintId}>{hint}</div>}
      </div>
    )
  }

  const common = {
    id,
    'value':            typeof value === 'string' ? value : '',
    'aria-required':    spec.required,
    'aria-invalid':     error !== undefined,
    'aria-describedby': describedBy,
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id}>
        {flagName}
        {spec.valueName === undefined ? '' : ` <${spec.valueName}>`}
        {spec.required ? ' (required)' : ''}
      </label>
      <br />
      {spec.choices === undefined
        ? <input {...common} type='text' onChange={event => onChange(event.target.value)} />
        : (
            <select {...common} onChange={event => onChange(event.target.value)}>
              <option value=''>{spec.defaultValue === undefined ? '(not set)' : `(default: ${spec.defaultValue})`}</option>
              {spec.choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
            </select>
          )}
      {hint !== '' && <div id={hintId}>{hint}</div>}
      {error !== undefined && <div id={errorId} style={{ color: '#b00020' }}>{error}</div>}
    </div>
  )
}
