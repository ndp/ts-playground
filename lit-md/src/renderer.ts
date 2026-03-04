import type { DocNode } from './parser.ts'

const langAliases: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
}

export function render(nodes: DocNode[]): string {
  const visible = nodes.filter(n => n.kind !== 'output-file-display')
  if (!visible.length) return ''
  let out = ''
  for (let i = 0; i < visible.length; i++) {
    if (i > 0) {
      const prev = visible[i - 1]!
      out += prev.kind === 'prose' && prev.noBlankAfter ? '\n' : '\n\n'
    }
    out += renderNode(visible[i]!)
  }
  return out
}

function renderNode(node: DocNode): string {
  if (node.kind === 'prose') return node.text
  if (node.kind === 'output-file-display') return ''
  const lang = langAliases[node.lang] ?? node.lang
  const info = node.title ? `${lang} ${node.title}` : lang
  return `\`\`\`${info}\n${node.text}\n\`\`\``
}
