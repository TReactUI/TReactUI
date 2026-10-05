import { render, screen } from '@testing-library/react'
import { AccessibilityLayer } from './accessibility-layer.component'

describe('AccessibilityLayer', () => {
  it('exposes the described list with its selected item', () => {
    render(
      <AccessibilityLayer
        snapshot={{
          title: 'Downloads',
          nodes: [{
            role:     'list',
            label:    'Queue',
            children: [
              { role: 'option', label: 'Song A', selected: true },
              { role: 'option', label: 'Song B' },
            ],
          }],
        }}
      />,
    )

    expect(screen.getByRole('region', { name: 'Downloads', hidden: true })).toBeTruthy()
    expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(2)
    expect(screen.getByRole('option', { name: 'Song A', selected: true, hidden: true })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Song B', selected: true, hidden: true })).toBeNull()
  })

  it('routes an assertive announcement to the alert region only', () => {
    render(<AccessibilityLayer announcement={{ text: 'Failed', politeness: 'assertive' }} />)

    expect(screen.getByRole('alert', { hidden: true })).toHaveProperty('textContent', 'Failed')
    expect(screen.getByRole('status', { hidden: true })).toHaveProperty('textContent', '')
  })
})
