import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

describe('integration: lit-md CLI end-to-end', () => {

  test('generates README.md from encoder fixture and matches expected output', () => {
    const fixtureDir = join(__dir, 'fixtures/encoder')
    const inputFile = join(fixtureDir, 'README.ts')
    const expectedFile = join(fixtureDir, 'README.md')
    const outputFile = join(fixtureDir, 'README.generated.md')

    // Run the CLI
    execFileSync(
      process.execPath,
      ['--experimental-strip-types', join(__dir, 'cli.ts'), inputFile, '--out', outputFile],
      { env: process.env }
    )

    const generated = readFileSync(outputFile, 'utf8').trim()
    const expected = readFileSync(expectedFile, 'utf8').trim()

    // Clean up
    try { unlinkSync(outputFile) } catch {}

    assert.equal(generated, expected)
  })

})
