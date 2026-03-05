import {describe, test} from 'node:test'
import {readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'url'
import {dirname, join, extname, basename} from 'path'
import {parse} from '../src/parser.ts'
import {render} from '../src/renderer.ts'
import {resolveOutputFiles} from '../src/resolver.ts'
import {resetDescribeFormat} from '../src/describe-format.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(join(__dir, 'acceptance'), { withFileTypes: true })
  .filter(d => d.isFile() && (d.name.endsWith('.ts') || d.name.endsWith('.js')))

function colorize(diff: string): string {
  const { TERM, COLORTERM, FORCE_COLOR, NO_COLOR } = process.env
  const useColor = !NO_COLOR && (
    FORCE_COLOR !== undefined ||
    COLORTERM !== undefined ||
    (TERM !== undefined && TERM !== 'dumb') ||
    process.stdout.isTTY ||
    process.stderr.isTTY
  )
  if (!useColor) return diff
  return diff.split('\n').map(line => {
    if (line.startsWith('---') || line.startsWith('+++')) return `\x1b[1m${line}\x1b[0m`
    if (line.startsWith('-')) return `\x1b[31m${line}\x1b[0m`
    if (line.startsWith('+')) return `\x1b[32m${line}\x1b[0m`
    if (line.startsWith('@@')) return `\x1b[36m${line}\x1b[0m`
    return line
  }).join('\n')
}

function computeDiff(name: string, expected: string, actual: string): string | null {
  const dir = mkdtempSync(join(tmpdir(), `lit-md-${name}-`))
  const expFile = join(dir, 'expected.md')
  const actFile = join(dir, 'actual.md')
  try {
    writeFileSync(expFile, expected)
    writeFileSync(actFile, actual)
    const result = spawnSync('diff', ['-u', '--label', 'expected', '--label', 'actual', expFile, actFile])
    if (result.status === 0) return null
    return colorize(result.stdout.toString())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('acceptance', () => {
  files.forEach(dirent => {
    const name = basename(dirent.name, extname(dirent.name))
    test(name, async () => {
      // Reset the describe format override before each test
      resetDescribeFormat()
      
      const inputPath = join(__dir, 'acceptance', dirent.name)
      const snapshotPath = join(__dir, 'acceptance', `${name}.snapshot.md`)

      // Import the file to allow module-level setup (like setDescribeFormat calls)
      try {
        await import(inputPath)
      } catch {
        // File might not be importable, continue
      }

      const src = readFileSync(inputPath, 'utf8')
      const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
      
      // Detect describe format from filename (e.g., describe-h1 -> #, describe-auto -> auto)
      let describeFormat = 'hidden'
      if (name.includes('describe-hidden')) describeFormat = 'hidden'
      else if (name.includes('describe-auto')) describeFormat = 'auto'
      else if (name.includes('describe-h1')) describeFormat = '#'
      else if (name.includes('describe-h2')) describeFormat = '##'
      else if (name.includes('describe-h3')) describeFormat = '###'
      else if (name.includes('describe-h4')) describeFormat = '####'
      
      const { resolveDescribeFormat } = await import('../src/describe-format.ts')
      const finalDescribeFormat = resolveDescribeFormat(describeFormat)
      const generated = render(resolveOutputFiles(parse(src, lang)), finalDescribeFormat).trimEnd()
      const expected = readFileSync(snapshotPath, 'utf8').trimEnd()

      const diff = computeDiff(name, expected, generated)
      if (diff !== null) throw new Error(`\n${diff}`)
    })
  })
})
