import type { A11yNode } from '@treactui/protocol'

const ROLES_WITH_OWN_TEXT = new Set(['text', 'textbox', 'button', 'heading', 'listitem', 'option', 'status'])

/** Renders one described element, and its children, as ARIA. */
export function A11yNodeView ({ node }: { node: A11yNode }) {
  const isProgress = node.role === 'progressbar'

  return (
    <div
      role={node.role === 'text' ? undefined : node.role}
      aria-label={node.label}
      aria-selected={node.role === 'option' ? node.selected === true : undefined}
      aria-current={node.focused === true ? 'true' : undefined}
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
