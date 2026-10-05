import { fireEvent, render, screen } from '@testing-library/react'
import type { CommandSpec } from '@trectui/protocol'
import { CommandLauncher } from './command-launcher.component'

const commands: CommandSpec[] = [
  {
    name:        'greet',
    description: 'Print a greeting',
    arguments:   [{ name: 'name', description: 'who to greet', required: true, variadic: false }],
    options:     [
      { flag: '--shout', short: '-s', description: 'greet loudly', takesValue: false, required: false },
      { flag: '--mode', takesValue: true, valueName: 'mode', choices: ['a', 'b'], required: false },
    ],
  },
  { name: 'countdown', arguments: [], options: [] },
]

describe('CommandLauncher', () => {
  it('labels every field and ties the description to the command', () => {
    render(<CommandLauncher commands={commands} onRun={jest.fn()} />)

    expect(screen.getByRole('form', { name: 'Run a command' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Command' })).toHaveProperty('value', 'greet')
    expect(screen.getByRole('combobox', { name: 'Command' }).getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'name (required)' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: '--shout, -s' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '--mode <mode>' })).toBeTruthy()
  })

  it('runs the chosen command with the arguments built from the form', () => {
    const onRun = jest.fn()
    render(<CommandLauncher commands={commands} onRun={onRun} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'name (required)' }), { target: { value: 'Ada' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '--shout, -s' }))
    fireEvent.change(screen.getByRole('combobox', { name: '--mode <mode>' }), { target: { value: 'b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(onRun).toHaveBeenCalledWith('greet', ['--shout', '--mode', 'b', 'Ada'])
  })

  it('does not run with a required argument missing, and says which field and why', () => {
    const onRun = jest.fn()
    render(<CommandLauncher commands={commands} onRun={onRun} />)

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(onRun).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('name is required')
    const field = screen.getByRole('textbox', { name: 'name (required)' })
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toContain('error')
    expect(document.activeElement).toBe(field)
  })

  it('offers each command in turn and starts its form fresh', () => {
    const onRun = jest.fn()
    render(<CommandLauncher commands={commands} onRun={onRun} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'name (required)' }), { target: { value: 'Ada' } })

    fireEvent.change(screen.getByRole('combobox', { name: 'Command' }), { target: { value: 'countdown' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(screen.queryByRole('textbox', { name: 'name (required)' })).toBeNull()
    expect(onRun).toHaveBeenCalledWith('countdown', [])
  })

  it('moves focus to its heading when it appears, so the change of screen is announced', () => {
    render(<CommandLauncher commands={commands} onRun={jest.fn()} />)

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Run a command' }))
  })
})
