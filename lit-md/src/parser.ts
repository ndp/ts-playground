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

      // Detect shell`...` tagged template
      if (ts.isTaggedTemplateExpression(expr) && ts.isIdentifier(expr.tag) && expr.tag.text === 'shell') {
        const title = pendingFileLabel
        pendingFileLabel = undefined
        const text = extractShellTemplateText(src, expr.template)
        nodes.push({ kind: 'code', lang: 'sh', text, title })
        return
      }

      if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
        const name = expr.expression.text
      if (name === 'test' || name === 'it' || name === 'example') {
          const testName = getStringArg(expr, 0)
          const body = getFnBody(expr, 1)
          if (body) {
            const code = extractBodyCode(src, body)
            if (code.trim()) {
              const title = pendingFileLabel ?? undefined
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
        if (name === 'shellExample') {
          const cmd = getStringArg(expr, 0)
          if (cmd !== null) {
            const title = pendingFileLabel
            pendingFileLabel = undefined
            const optsArg = expr.arguments[1]
            
            // Extract multi-line input files and create separate code blocks
            if (optsArg && ts.isObjectLiteralExpression(optsArg)) {
              processShellExampleInputFiles(src, optsArg, nodes)
            }
            
            // Add the shell command block
            const lines: string[] = [cmd]
            if (optsArg && ts.isObjectLiteralExpression(optsArg)) {
              appendShellExampleAnnotations(src, optsArg, lines)
            }
            nodes.push({ kind: 'code', lang: 'sh', text: lines.join('\n'), title })
          }
          return
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
  const base = stmts[0]!.getFullStart()
  let raw = src.slice(base, extractEnd)

  // Rewrite recognised assertion statements (end-to-start to preserve offsets)
  const replacements: Array<{ start: number; end: number; text: string }> = []
  for (const stmt of stmts) {
    const rewritten = tryRewriteAssertion(src, stmt)
    if (rewritten !== null) {
      replacements.push({ start: stmt.getStart() - base, end: stmt.getEnd() - base, text: rewritten })
    }
  }
  replacements.sort((a, b) => b.start - a.start)
  for (const r of replacements) {
    raw = raw.slice(0, r.start) + r.text + raw.slice(r.end)
  }

  // Dedent: remove `indent` leading spaces from any line that starts with at least that many spaces.
  // Lines with fewer leading spaces (e.g. template literal content) are kept as-is.
  let result = raw
    .split('\n')
    .map(line => (line.length >= indent && line.slice(0, indent).trim() === '') ? line.slice(indent) : line)
    .join('\n')
    .trim()

  // Clean up consecutive blank lines from dropped statements
  result = result.replace(/\n\n+/g, '\n')

  // Transform nested assert.ok(expr) → expr // OK
  result = transformNestedAssertOk(result)

  return result
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

/** Rewrite a recognised assert.X(actual, expected) statement to a readable comment form.
 *  Returns the rewritten string, or null if the statement is not a recognised assertion.
 *  Special case: assert.ok() at statement level returns empty string (drops the line). */
function tryRewriteAssertion(src: string, stmt: ts.Statement): string | null {
  if (!ts.isExpressionStatement(stmt)) return null
  const expr = stmt.expression
  if (!ts.isCallExpression(expr)) return null
  if (!ts.isPropertyAccessExpression(expr.expression)) return null

  const obj = expr.expression.expression
  const method = expr.expression.name.text
  if (!ts.isIdentifier(obj) || obj.text !== 'assert') return null

  // assert.ok(value) at statement level → drop the line (empty string)
  if (method === 'ok') {
    return ''
  }

  // assert.throws(() => expr, pattern?) → expr // throws [pattern]
  if (method === 'throws') {
    const fn = expr.arguments[0]
    if (!fn) return null
    if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) {
      const exprText = src.slice(fn.body.getStart(), fn.body.getEnd())
      const patternArg = expr.arguments[1]
      const patternText = patternArg ? src.slice(patternArg.getStart(), patternArg.getEnd()) : null
      return patternText ? `${exprText} // throws ${patternText}` : `${exprText} // throws`
    }
    return null
  }

  const [actual, expected] = expr.arguments
  if (!actual || !expected) return null

  const actualText = src.slice(actual.getStart(), actual.getEnd())

  if (['equal', 'strictEqual', 'deepEqual', 'deepStrictEqual'].includes(method)) {
    return formatComparison(src, actual, expected, '=>')
  }
  if (['notEqual', 'notStrictEqual', 'notDeepEqual', 'notDeepStrictEqual'].includes(method)) {
    return formatComparison(src, actual, expected, '!=')
  }

  return null
}

function formatComparison(
  src: string,
  actual: ts.Expression,
  expected: ts.Expression,
  op: string
): string {
  const actualText = src.slice(actual.getStart(), actual.getEnd())
  const expectedRaw = src.slice(expected.getStart(), expected.getEnd())

  // Dedent continuation lines by their minimum indentation
  const expectedText = dedentContinuationLines(expectedRaw)

  const lines = expectedText.split('\n')
  if (lines.length === 1) {
    return `${actualText} // ${op} ${expectedText}`
  }
  // Multi-line: first line appended to actual, remaining lines become // comments
  const first = lines[0]!
  const rest = lines.slice(1).map(l => `// ${l}`)
  return [`${actualText} // ${op} ${first}`, ...rest].join('\n')
}

/** Dedent continuation lines (lines after the first) by their minimum indentation. */
function dedentContinuationLines(text: string): string {
  const lines = text.split('\n')
  if (lines.length === 1) return text
  const contLines = lines.slice(1).filter(l => l.trim().length > 0)
  if (!contLines.length) return text
  const minInd = Math.min(...contLines.map(l => l.length - l.trimStart().length))
  if (minInd === 0) return text
  return [
    lines[0]!,
    ...lines.slice(1).map(l => (l.length >= minInd && l.slice(0, minInd).trim() === '') ? l.slice(minInd) : l)
  ].join('\n')
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

/** Transform nested assert.ok(expr) calls to expr // OK */
function transformNestedAssertOk(code: string): string {
  // Match assert.ok(...) but only those NOT at statement level
  // Simple approach: match assert.ok(identifier) or assert.ok(expr)
  // We use a regex to find and replace: assert\.ok\(([^)]+)\) → $1 // OK
  // This is a heuristic that works for simple cases
  return code.replace(/assert\.ok\(([^)]+)\)/g, '$1 // OK')
}

/** Extracts dedented text from a template literal used in shell`...` */
function extractShellTemplateText(src: string, template: ts.TemplateLiteral): string {
  const raw = ts.isNoSubstitutionTemplateLiteral(template)
    ? template.text
    : template.head.text
  const lines = raw.split('\n')
  // Dedent: find minimum indentation of non-empty lines
  const nonEmpty = lines.filter(l => l.trim().length > 0)
  if (!nonEmpty.length) return raw.trim()
  const minInd = Math.min(...nonEmpty.map(l => l.length - l.trimStart().length))
  return lines
    .map(l => (minInd > 0 && l.startsWith(' '.repeat(minInd))) ? l.slice(minInd) : l)
    .join('\n')
    .trim()
}

/** Helper to detect language from file extension */
function getLanguageFromExtension(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'sh',
    bash: 'bash',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    html: 'html',
    css: 'css',
    xml: 'xml',
    txt: 'text'
  }
  return langMap[ext] || ext || 'text'
}

/** Helper to detect if a language supports C-style comments (// ...) */
function supportsCStyleComments(lang: string): boolean {
  const cStyleLangs = new Set([
    'typescript', 'javascript', 'java', 'csharp', 'go', 'rust',
    'cpp', 'c', 'objc', 'swift', 'kotlin', 'scala', 'groovy'
  ])
  return cStyleLangs.has(lang)
}

/** Extracts input files from shellExample options and creates separate code blocks */
function processShellExampleInputFiles(src: string, opts: ts.ObjectLiteralExpression, nodes: DocNode[]): void {
  const inputFilesProp = opts.properties.find(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'inputFiles')
  
  if (!inputFilesProp || !ts.isPropertyAssignment(inputFilesProp) || !ts.isArrayLiteralExpression(inputFilesProp.initializer)) {
    return
  }

  for (const el of inputFilesProp.initializer.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue
    const pathProp = el.properties.find(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'path')
    const contentProp = el.properties.find(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'content')

    if (!pathProp || !ts.isPropertyAssignment(pathProp) || !ts.isStringLiteralLike(pathProp.initializer)) continue
    const filePath = pathProp.initializer.text

    if (contentProp && ts.isPropertyAssignment(contentProp) && ts.isStringLiteralLike(contentProp.initializer)) {
      const content = contentProp.initializer.text
      const lang = getLanguageFromExtension(filePath)
      
      // Add label/prose based on language type
      if (!supportsCStyleComments(lang)) {
        // Non-C-style: add prose label before code block
        nodes.push({ kind: 'prose', text: `With input file ${filePath}:` })
      }
      
      // Create code block with label for C-style languages
      let blockText = content
      if (supportsCStyleComments(lang)) {
        blockText = `// Input file "${filePath}":\n${content}`
      }
      
      nodes.push({ kind: 'code', lang, text: blockText, title: filePath })
    }
  }
}

/** Reads shellExample options and appends annotation lines (# => ..., # output-file: ..., single-line # input-file: ...) */
function appendShellExampleAnnotations(src: string, opts: ts.ObjectLiteralExpression, lines: string[]): void {
  for (const prop of opts.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue
    const key = prop.name.text

    if (key === 'stdout' && ts.isStringLiteralLike(prop.initializer)) {
      lines.push(`# => ${prop.initializer.text}`)
    }

    if (key === 'inputFiles' && ts.isArrayLiteralExpression(prop.initializer)) {
      for (const el of prop.initializer.elements) {
        if (!ts.isObjectLiteralExpression(el)) continue
        const pathProp = el.properties.find(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'path')
        const contentProp = el.properties.find(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'content')

        if (!pathProp || !ts.isPropertyAssignment(pathProp) || !ts.isStringLiteralLike(pathProp.initializer)) continue
        const filePath = pathProp.initializer.text

        if (contentProp && ts.isPropertyAssignment(contentProp) && ts.isStringLiteralLike(contentProp.initializer)) {
          const content = contentProp.initializer.text
          // Only add single-line files as annotations; multi-line files are separate code blocks
          if (!content.includes('\n')) {
            lines.push(`# Input file \`${filePath}\` contains \`${content}\``)
          }
        }
      }
    }

    if (key === 'outputFiles' && ts.isArrayLiteralExpression(prop.initializer)) {
      for (const el of prop.initializer.elements) {
        if (!ts.isObjectLiteralExpression(el)) continue
        const pathProp = el.properties.find(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'path')
        const containsProp = el.properties.find(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'contains')
        const matchesProp = el.properties.find(p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'matches')

        if (!pathProp || !ts.isPropertyAssignment(pathProp) || !ts.isStringLiteralLike(pathProp.initializer)) continue
        const filePath = pathProp.initializer.text

        if (containsProp && ts.isPropertyAssignment(containsProp) && ts.isStringLiteralLike(containsProp.initializer)) {
          const text = containsProp.initializer.text
          if (text.includes('\n')) {
            lines.push(`# output-file: ${filePath} contains:`)
            for (const line of text.split('\n')) {
              lines.push(line.length === 0 ? '#' : `#   ${line}`)
            }
          } else {
            lines.push(`# output-file: ${filePath} contains "${text}"`)
          }
        }

        if (matchesProp && ts.isPropertyAssignment(matchesProp) && ts.isRegularExpressionLiteral(matchesProp.initializer)) {
          const regexText = src.slice(matchesProp.initializer.getStart(), matchesProp.initializer.getEnd())
          lines.push(`# output-file: ${filePath} matches ${regexText}`)
        }
      }
    }
  }
}
