import type { DocNode } from './parser.ts'

export function render(nodes: DocNode[]): string {
  if (!nodes.length) return ''
  return nodes
    .map(node => renderNode(node))
    .join('\n\n')
}

function renderNode(node: DocNode): string {
  if (node.kind === 'prose') return node.text
  const info = node.title ? `${node.lang} ${node.title}` : node.lang
  return `\`\`\`${info}\n${node.text}\n\`\`\``
}
