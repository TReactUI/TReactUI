import type { A11yNode, A11ySnapshot } from '@treactui/protocol'

function findSelectedOption (nodes: A11yNode[]): A11yNode | undefined {
  for (const node of nodes) {
    if (node.role === 'option' && node.selected === true) return node
    const inner = node.children === undefined ? undefined : findSelectedOption(node.children)
    if (inner !== undefined) return inner
  }

  return undefined
}

/** The spoken name of the first selected option on a described screen, if any. */
export function selectedOptionLabel (snapshot: A11ySnapshot): string | undefined {
  const node = findSelectedOption(snapshot.nodes)

  return node === undefined ? undefined : node.label ?? node.value
}
