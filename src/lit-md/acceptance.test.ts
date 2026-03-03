import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {parse} from './parser.ts'
import {render} from './renderer.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(__dir + "/acceptance/", {withFileTypes: true});

describe('acceptance', () => {
  files.forEach(dirent => test(dirent.name, () => {
    const inputPath = join(__dir, 'acceptance', dirent.name, 'input.ts')
    const outputPath = join(__dir, 'acceptance', dirent.name, 'output.md')

    const src = readFileSync(inputPath, 'utf8')
    const generated = render(parse(src)).trimEnd()
    const expected = readFileSync(outputPath, 'utf8').trimEnd()

    assert.equal(generated, expected)
  }))
})
