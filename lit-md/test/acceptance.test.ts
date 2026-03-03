import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, readdirSync, existsSync} from 'node:fs'
import {fileURLToPath} from 'url'
import {dirname, join, extname} from 'path'
import {parse} from '../src/parser.ts'
import {render} from '../src/renderer.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(__dir + "/acceptance/", {withFileTypes: true});

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

    assert.equal(generated, expected)
  }))
})
