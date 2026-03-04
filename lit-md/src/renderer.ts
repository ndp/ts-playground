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
  let lang = langAliases[node.lang] ?? node.lang
  // Omit language if it's 'text'
  const info = lang === 'text' ? (node.title ?? '') : (node.title ? `${lang} ${node.title}` : lang)
  
  // Use dynamic fence delimiters to handle nested code blocks
  // Find the longest sequence of backticks in the content
  const maxBackticks = findMaxBacktickSequence(node.text)
  const fenceLength = Math.max(3, maxBackticks + 1)
  const fence = '`'.repeat(fenceLength)
  
  return `${fence}${info}\n${node.text}\n${fence}`
}

function findMaxBacktickSequence(text: string): number {
  let maxSeq = 0
  let currentSeq = 0
  for (const char of text) {
    if (char === '`') {
      currentSeq++
      maxSeq = Math.max(maxSeq, currentSeq)
    } else {
      currentSeq = 0
    }
  }
  return maxSeq
}
