import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { parse } from './parser.ts'
import { render } from './renderer.ts'

const __dir = dirname(fileURLToPath(import.meta.url))

function acceptanceTest(folder: string): void {
  test(folder, () => {
    const inputPath = join(__dir, 'acceptance', folder, 'input.ts')
    const outputPath = join(__dir, 'acceptance', folder, 'output.md')

    const src = readFileSync(inputPath, 'utf8')
    const generated = render(parse(src)).trimEnd()
    const expected = readFileSync(outputPath, 'utf8').trimEnd()

    assert.equal(generated, expected)
  })
}

describe('acceptance', () => {
  acceptanceTest('basic-prose')
})
