import type { A11yNode } from '@treactui/protocol'

const ROLES_WITH_OWN_TEXT = new Set(['text', 'textbox', 'button', 'heading', 'listitem', 'option', 'status'])

/**
 * The ARIA role this mirror renders for a described role.
 *
 * The mirror is read-only: the real widget is the terminal. A `listbox` would be
 * an interactive widget that a screen reader treats as one stop in browse mode
 * (its options only read in focus mode), and pressing arrows on it would do
 * nothing. So a described listbox is rendered as a plain list of items, read one
 * by one, with the selected item marked `aria-current`.
 */
function renderedRole (role: A11yNode['role']): string | undefined {
  if (role === 'text') return undefined
  if (role === 'listbox') return 'list'
  if (role === 'option') return 'listitem'

  return role
}

/** Renders one described element, and its children, as ARIA. */
export function A11yNodeView ({ node }: { node: A11yNode }) {
  const isProgress = node.role === 'progressbar'

  return (
    <div
      role={renderedRole(node.role)}
      aria-label={node.label}
      aria-current={node.selected === true || node.focused === true ? 'true' : undefined}
      aria-valuenow={isProgress ? node.valueNow : undefined}
      aria-valuemin={isProgress ? 0 : undefined}
      aria-valuemax={isProgress ? 100 : undefined}
      aria-level={node.role === 'heading' ? 2 : undefined}
    >
      {ROLES_WITH_OWN_TEXT.has(node.role) ? node.value ?? node.label : null}
      {/* eslint-disable-next-line @eslint-react/no-array-index-key -- nodes carry no id; the tree is replaced wholesale on every snapshot */}
      {node.children?.map((child, index) => <A11yNodeView key={index} node={child} />)}
    </div>
  )
}
