import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {parse} from './parser.ts'
import {render} from './renderer.ts'
import {readdirSync} from "node:fs";

const __dir = dirname(fileURLToPath(import.meta.url))

describe('acceptance', () => {
  const files = readdirSync("./acceptance/", {withFileTypes: true});
  files.forEach(dirent => test(dirent.name, () => {
    const inputPath = join(__dir, 'acceptance', dirent.name, 'input.ts')
    const outputPath = join(__dir, 'acceptance', dirent.name, 'output.md')

    const src = readFileSync(inputPath, 'utf8')
    const generated = render(parse(src)).trimEnd()
    const expected = readFileSync(outputPath, 'utf8').trimEnd()

    assert.equal(generated, expected)
  }))
})
