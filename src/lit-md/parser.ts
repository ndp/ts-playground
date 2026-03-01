import ts from 'typescript'

export type ProseNode = { kind: 'prose'; text: string }
export type CodeNode = { kind: 'code'; lang: string; text: string; title?: string }
export type DocNode = ProseNode | CodeNode

export function parse(src: string, lang = 'typescript'): DocNode[] {
  if (!src.trim()) return []

  const sf = ts.createSourceFile('input.ts', src, ts.ScriptTarget.Latest, true)
  const nodes: DocNode[] = []
  const processedCommentRanges = new Set<number>()
  let pendingFileLabel: string | undefined = undefined

  function extractLeadingComments(pos: number): void {
    const ranges = ts.getLeadingCommentRanges(src, pos) ?? []
    for (const r of ranges) {
      if (processedCommentRanges.has(r.pos)) continue
      processedCommentRanges.add(r.pos)
      const raw = src.slice(r.pos, r.end)

      // Check for // file: directive first
      if (r.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
        const fileMatch = raw.match(/^\/\/\s*file:\s*(.+)$/)
        if (fileMatch) {
          pendingFileLabel = fileMatch[1]!.trim()
          continue
        }
      }

      const prose = commentToProse(raw, r.kind)
      if (prose !== null) mergeOrPushProse(nodes, prose)
    }
  }

  function visitStatements(statements: ts.NodeArray<ts.Statement>): void {
    for (const stmt of statements) {
      extractLeadingComments(stmt.getFullStart())
      processStatement(stmt)
    }
  }

  function processStatement(stmt: ts.Statement): void {
    // Handle import declarations
    if (ts.isImportDeclaration(stmt)) {
      // Get the full line text (including any trailing comment like // keep)
      const lineEnd = src.indexOf('\n', stmt.getEnd())
      const lineText = src.slice(stmt.getStart(), lineEnd === -1 ? src.length : lineEnd).trimEnd()
      if (isKeptImport(lineText)) {
        const title = pendingFileLabel
        pendingFileLabel = undefined
        mergeOrPushCode(nodes, lineText, lang, title)
      }
      return
    }

    // Detect test('name', () => { ... }) calls
    if (ts.isExpressionStatement(stmt)) {
      const expr = stmt.expression
      if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
        const name = expr.expression.text
      if (name === 'test' || name === 'it') {
          const testName = getStringArg(expr, 0)
          const body = getFnBody(expr, 1)
          if (body) {
            const code = extractBodyCode(src, body)
            if (code.trim()) {
              const title = pendingFileLabel ?? testName ?? undefined
              pendingFileLabel = undefined
              // Check if the previous prose node ended with a code fence → merge
              const prev = nodes[nodes.length - 1]
              if (prev?.kind === 'prose') {
                const fenceMatch = extractTrailingFence(prev.text)
                if (fenceMatch) {
                  prev.text = fenceMatch.prose
                  const mergedCode = fenceMatch.fenceCode + '\n' + code
                  nodes.push({ kind: 'code', lang, text: mergedCode, title })
                } else {
                  nodes.push({ kind: 'code', lang, text: code, title })
                }
              } else {
                nodes.push({ kind: 'code', lang, text: code, title })
              }
            }
            return
          }
        }
        if (name === 'describe') {
          const body = getFnBody(expr, 1)
          if (body) {
            visitStatements(body.statements)
            return
          }
        }
      }
    }
  }

  visitStatements(sf.statements)

  // Capture comments before EOF token
  extractLeadingComments(sf.endOfFileToken.getFullStart())

  return nodes
}

function getStringArg(call: ts.CallExpression, index: number): string | null {
  const arg = call.arguments[index]
  if (arg && ts.isStringLiteralLike(arg)) return arg.text
  return null
}

function getFnBody(call: ts.CallExpression, index: number): ts.Block | null {
  const arg = call.arguments[index]
  if (!arg) return null
  if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
    if (ts.isBlock(arg.body)) return arg.body
  }
  return null
}

function extractBodyCode(src: string, block: ts.Block): string {
  const stmts = block.statements
  if (!stmts.length) return ''

  // Compute block indentation from the column of the first statement token
  const firstStart = stmts[0]!.getStart()
  const lineStart = src.lastIndexOf('\n', firstStart - 1) + 1
  const indent = firstStart - lineStart

  // Include trailing // comment on the last statement's line
  const lastStmt = stmts[stmts.length - 1]!
  const lastEnd = lastStmt.getEnd()
  const lastLineEnd = src.indexOf('\n', lastEnd)
  const textAfterLast = src.slice(lastEnd, lastLineEnd === -1 ? src.length : lastLineEnd)
  const extractEnd = /^\s*\/\//.test(textAfterLast)
    ? (lastLineEnd === -1 ? src.length : lastLineEnd)
    : lastEnd

  // Extract from the full start of the first statement (includes leading whitespace/comments)
  const raw = src.slice(stmts[0]!.getFullStart(), extractEnd)

  // Dedent: remove `indent` leading spaces from any line that starts with at least that many spaces.
  // Lines with fewer leading spaces (e.g. template literal content) are kept as-is.
  return raw
    .split('\n')
    .map(line => (line.length >= indent && line.slice(0, indent).trim() === '') ? line.slice(indent) : line)
    .join('\n')
    .trim()
}

function commentToProse(raw: string, kind: ts.CommentKind): string | null {
  if (kind === ts.SyntaxKind.SingleLineCommentTrivia) {
    return raw.replace(/^\/\/\s?/, '')
  }
  if (kind === ts.SyntaxKind.MultiLineCommentTrivia) {
    const inner = raw
      .replace(/^\/\*+/, '')
      .replace(/\*+\/$/, '')
      .split('\n')
      .map(l => l.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim()
    return inner || null
  }
  return null
}

function isKeptImport(text: string): boolean {
  return /\/\/\s*keep\b/.test(text)
}

/** If prose ends with a ```…``` fence, split it off. Returns null if no trailing fence. */
function extractTrailingFence(prose: string): { prose: string; fenceCode: string } | null {
  // Match a trailing fenced code block: ```(lang)?\n...\n```
  const match = prose.match(/^([\s\S]*?)\n?```[^\n]*\n([\s\S]*?)```\s*$/)
  if (!match) return null
  return {
    prose: match[1]!.trimEnd(),
    fenceCode: match[2]!.trimEnd()
  }
}

function mergeOrPushCode(nodes: DocNode[], text: string, lang: string, title: string | undefined): void {
  const last = nodes[nodes.length - 1]
  // Merge consecutive kept imports into one code block
  if (last?.kind === 'code' && last.title === undefined && title === undefined) {
    last.text = last.text + '\n' + text
  } else {
    nodes.push({ kind: 'code', lang, text, title })
  }
}

function mergeOrPushProse(nodes: DocNode[], text: string): void {
  const last = nodes[nodes.length - 1]
  if (last?.kind === 'prose') {
    last.text = last.text + '\n' + text
  } else {
    nodes.push({ kind: 'prose', text })
  }
}
