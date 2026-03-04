import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { DocNode, OutputFileDisplayNode } from './parser.ts'

/**
 * Resolves `output-file-display` nodes by actually executing the shell command,
 * reading the output file, and replacing the node with a code block.
 * Updates the preceding prose summary to end with `:` (instead of `.`) when content is shown.
 * Nodes with no output (empty file or command failure) are silently dropped.
 */
export function resolveOutputFiles(nodes: DocNode[]): DocNode[] {
  const result: DocNode[] = []
  for (const node of nodes) {
    if (node.kind !== 'output-file-display') {
      result.push(node)
      continue
    }
    const content = runAndCapture(node)
    if (content !== null && content.trim()) {
      const prev = result[result.length - 1]
      if (prev?.kind === 'prose' && prev.text.endsWith('.')) {
        result[result.length - 1] = { ...prev, text: prev.text.slice(0, -1) + ':', noBlankAfter: true }
      }
      result.push({ kind: 'code', lang: node.lang, text: content.trimEnd(), title: node.path })
    }
  }
  return result
}

function runAndCapture(node: OutputFileDisplayNode): string | null {
  const tmpDir = mkdtempSync(join(tmpdir(), 'lit-md-cap-'))
  try {
    for (const f of node.inputFiles) {
      writeFileSync(join(tmpDir, f.path), f.content, 'utf8')
    }
    const result = spawnSync(node.cmd, { shell: true, encoding: 'utf8', cwd: tmpDir })
    if (result.status !== 0) return null
    try {
      return readFileSync(join(tmpDir, node.path), 'utf8')
    } catch {
      return null
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
