import type { ArgumentSpec } from '@treactui/protocol'

export interface ArgumentFieldProps {
  id:       string
  spec:     ArgumentSpec
  value:    string
  error:    string | undefined
  onChange: (value: string) => void
}

/** One positional argument: a labelled text field, or a select when the command lists its choices. */
export function ArgumentField ({ id, spec, value, error, onChange }: ArgumentFieldProps) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const hint = [
    spec.description,
    spec.variadic ? 'Separate several values with spaces.' : undefined,
    spec.defaultValue === undefined ? undefined : `Default: ${spec.defaultValue}.`,
  ].filter(Boolean).join(' ')
  const describedBy = [hint === '' ? undefined : hintId, error === undefined ? undefined : errorId].filter(Boolean).join(' ') || undefined
  const common = { id, value, 'aria-required': spec.required, 'aria-invalid': error !== undefined, 'aria-describedby': describedBy }

  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id}>
        {spec.name}
        {spec.required ? ' (required)' : ''}
      </label>
      <br />
      {spec.choices === undefined
        ? <input {...common} type='text' onChange={event => onChange(event.target.value)} />
        : (
            <select {...common} onChange={event => onChange(event.target.value)}>
              <option value=''>{spec.required ? 'Choose one' : '(none)'}</option>
              {spec.choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
            </select>
          )}
      {hint !== '' && <div id={hintId}>{hint}</div>}
      {error !== undefined && <div id={errorId} style={{ color: '#b00020' }}>{error}</div>}
    </div>
  )
}
