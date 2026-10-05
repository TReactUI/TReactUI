import { render, screen } from '@testing-library/react'
import { AccessibilityLayer } from './accessibility-layer.component'

const downloads = {
  title: 'Downloads',
  nodes: [{
    role:     'listbox' as const,
    label:    'Queue',
    children: [
      { role: 'option' as const, label: 'Song A', selected: true },
      { role: 'option' as const, label: 'Song B' },
    ],
  }],
}

describe('AccessibilityLayer', () => {
  it('exposes a described listbox as a list of items, with the selected item marked current', () => {
    render(<AccessibilityLayer snapshot={downloads} />)

    expect(screen.getByRole('region', { name: 'Downloads', hidden: true })).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Queue', hidden: true })).toBeTruthy()
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(2)
    expect(screen.getByText('Song A').getAttribute('aria-current')).toBe('true')
    expect(screen.getByText('Song B').getAttribute('aria-current')).toBeNull()
  })

  it('does not present the read-only mirror as an interactive listbox', () => {
    render(<AccessibilityLayer snapshot={downloads} />)

    expect(screen.queryByRole('listbox', { hidden: true })).toBeNull()
    expect(screen.queryByRole('option', { hidden: true })).toBeNull()
  })

  it('routes an assertive announcement to the alert region only', () => {
    render(<AccessibilityLayer announcement={{ text: 'Failed', politeness: 'assertive' }} />)

    expect(screen.getByRole('alert', { hidden: true })).toHaveProperty('textContent', 'Failed')
    expect(screen.getByRole('status', { hidden: true })).toHaveProperty('textContent', '')
  })

  it('lets the caller move focus into the screen region by id', () => {
    render(<AccessibilityLayer snapshot={downloads} regionId='screen-region' />)

    expect(document.getElementById('screen-region')?.getAttribute('aria-label')).toBe('Downloads')
  })
})
