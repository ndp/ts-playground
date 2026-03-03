import type { DocNode } from './parser.ts'

const langAliases: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
}

export function render(nodes: DocNode[]): string {
  if (!nodes.length) return ''
  return nodes
    .map(node => renderNode(node))
    .join('\n\n')
}

function renderNode(node: DocNode): string {
  if (node.kind === 'prose') return node.text
  const lang = langAliases[node.lang] ?? node.lang
  const info = node.title ? `${lang} ${node.title}` : lang
  return `\`\`\`${info}\n${node.text}\n\`\`\``
}
