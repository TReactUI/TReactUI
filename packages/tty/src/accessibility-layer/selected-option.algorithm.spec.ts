import type { A11ySnapshot } from '@treactui/protocol'
import { selectedOptionLabel } from './selected-option.algorithm'

const screen = (selected: number): A11ySnapshot => ({
  title: 'Tasks',
  nodes: [{
    role:     'listbox',
    label:    'Tasks',
    children: [
      { role: 'option', label: 'First', selected: selected === 0 },
      { role: 'option', label: 'Second', selected: selected === 1 },
    ],
  }],
})

describe('selectedOptionLabel', () => {
  it('names the selected option', () => {
    expect(selectedOptionLabel(screen(1))).toBe('Second')
  })

  it('finds an option nested several levels down', () => {
    const nested: A11ySnapshot = { title: 'x', nodes: [{ role: 'list', children: [{ role: 'listbox', children: [{ role: 'option', label: 'Deep', selected: true }] }] }] }

    expect(selectedOptionLabel(nested)).toBe('Deep')
  })

  it('falls back to the value when an option has no label', () => {
    expect(selectedOptionLabel({ title: 'x', nodes: [{ role: 'option', value: 'by value', selected: true }] })).toBe('by value')
  })

  it('is undefined when nothing is selected, or the screen has no options', () => {
    expect(selectedOptionLabel({ title: 'x', nodes: [{ role: 'option', label: 'A' }] })).toBeUndefined()
    expect(selectedOptionLabel({ title: 'x', nodes: [{ role: 'text', value: 'hi' }] })).toBeUndefined()
  })
})
