import type { A11ySnapshot, Politeness } from '@treactui/protocol'
import { A11yNodeView } from './a11y-node.component'
import { visuallyHidden } from './visually-hidden.style'

export interface AccessibilityLayerProps {
  snapshot?:     A11ySnapshot
  announcement?: { text: string, politeness: Politeness }
  /**
   * An id for the screen's region, so a
   * caller can move a screen reader into it (see `onEscape` on the terminal view).
   */
  regionId?:     string
}

/** A visually hidden, semantic twin of the terminal for screen readers. */
export function AccessibilityLayer ({ snapshot, announcement, regionId }: AccessibilityLayerProps) {
  return (
    <div style={visuallyHidden}>
      {snapshot !== undefined && (
        <section id={regionId} aria-label={snapshot.title}>
          <h1>{snapshot.title}</h1>
          {/* eslint-disable-next-line @eslint-react/no-array-index-key -- nodes carry no id; the list is replaced wholesale on every snapshot */}
          {snapshot.nodes.map((node, index) => <A11yNodeView key={index} node={node} />)}
        </section>
      )}
      <div role='status' aria-live='polite' aria-atomic='true'>
        {announcement?.politeness === 'polite' ? announcement.text : ''}
      </div>
      <div role='alert' aria-live='assertive' aria-atomic='true'>
        {announcement?.politeness === 'assertive' ? announcement.text : ''}
      </div>
    </div>
  )
}
