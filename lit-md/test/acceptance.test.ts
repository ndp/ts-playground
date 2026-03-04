import {describe, test} from 'node:test'
import {readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'url'
import {dirname, join, extname} from 'path'
import {parse} from '../src/parser.ts'
import {render} from '../src/renderer.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(__dir + "/acceptance/", {withFileTypes: true});

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
  files.forEach(dirent => test(dirent.name, () => {
    const jsPath = join(__dir, 'acceptance', dirent.name, 'input.js')
    const tsPath = join(__dir, 'acceptance', dirent.name, 'input.ts')
    const inputPath = existsSync(jsPath) ? jsPath : tsPath
    const outputPath = join(__dir, 'acceptance', dirent.name, 'output.md')

    const src = readFileSync(inputPath, 'utf8')
    const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
    const generated = render(parse(src, lang)).trimEnd()
    const expected = readFileSync(outputPath, 'utf8').trimEnd()

    const diff = computeDiff(dirent.name, expected, generated)
    if (diff !== null) throw new Error(`\n${diff}`)
  }))
})
