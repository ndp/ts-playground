import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs'
import { execFileSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const cli = join(__dir, '../src/cli.ts')
const nodeArgs = (extra: string[]) => [process.execPath, ['--experimental-strip-types', cli, ...extra]]

function runCli(args: string[], opts: { expectFail?: boolean } = {}): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', cli, ...args], {
    env: process.env,
    encoding: 'utf8',
  })
  if (!opts.expectFail && result.status !== 0) {
    throw new Error(`CLI failed (exit ${result.status}):\n${result.stderr}`)
  }
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status ?? 0 }
}

describe('integration: lit-md CLI end-to-end', () => {

  test('generates README.md from encoder fixture and matches expected output', () => {
    const fixtureDir = join(__dir, 'fixtures/encoder')
    const inputFile = join(fixtureDir, 'README.ts')
    const expectedFile = join(fixtureDir, 'README.md')
    const outputFile = join(fixtureDir, 'README.generated.md')

    execFileSync(process.execPath, ['--experimental-strip-types', cli, inputFile, '--out', outputFile], { env: process.env })

    const generated = readFileSync(outputFile, 'utf8').trim()
    const expected = readFileSync(expectedFile, 'utf8').trim()
    try { unlinkSync(outputFile) } catch {}

    assert.equal(generated, expected)
  })

  test('multiple input files: generates one .md per input', () => {
    const out1 = join(__dir, 'fixtures/encoder/a_test_out.md')
    const out2 = join(__dir, 'fixtures/encoder/b_test_out.md')
    const input1 = join(__dir, 'acceptance/basic-prose.ts')
    const input2 = join(__dir, 'acceptance/code-blocks.ts')
    try {
      // Copy inputs to temp files with distinct names so outputs don't collide
      const tmp1 = join(__dir, 'fixtures/encoder/a_test.ts')
      const tmp2 = join(__dir, 'fixtures/encoder/b_test.ts')
      writeFileSync(tmp1, readFileSync(input1, 'utf8'))
      writeFileSync(tmp2, readFileSync(input2, 'utf8'))
      runCli([tmp1, tmp2])
      assert.ok(existsSync(out1.replace('_out', '')), 'first output exists')
      assert.ok(existsSync(out2.replace('_out', '')), 'second output exists')
    } finally {
      for (const f of [
        join(__dir, 'fixtures/encoder/a_test.ts'),
        join(__dir, 'fixtures/encoder/b_test.ts'),
        join(__dir, 'fixtures/encoder/a_test.md'),
        join(__dir, 'fixtures/encoder/b_test.md'),
      ]) try { unlinkSync(f) } catch {}
    }
  })

  test('--out errors when multiple input files given', () => {
    const { stderr, status } = runCli([
      '--out', '/tmp/x.md',
      join(__dir, 'acceptance/basic-prose.ts'),
      join(__dir, 'acceptance/code-blocks.ts'),
    ], { expectFail: true })
    assert.equal(status, 1)
    assert.ok(stderr.includes('--out can only be used with a single input file'))
  })

  test('--outputDir: places all outputs in specified directory', () => {
    const outDir = join(__dir, 'fixtures/_outputdir_test')
    const input1 = join(__dir, 'acceptance/basic-prose.ts')
    const input2 = join(__dir, 'acceptance/code-blocks.ts')
    try {
      runCli(['--outputDir', outDir, input1, input2])
      assert.ok(existsSync(join(outDir, 'basic-prose.md')))
    } finally {
      try { rmSync(outDir, { recursive: true }) } catch {}
    }
  })

  test('--outputDir creates directory if it does not exist', () => {
    const outDir = join(__dir, 'fixtures/_new_dir_test')
    const input = join(__dir, 'acceptance/basic-prose.ts')
    try {
      assert.ok(!existsSync(outDir), 'dir should not exist before test')
      runCli(['--outputDir', outDir, input])
      assert.ok(existsSync(join(outDir, 'basic-prose.md')))
    } finally {
      try { rmSync(outDir, { recursive: true }) } catch {}
    }
  })

  test('--dryrun: prints "would write" and does not create file', () => {
    const input = join(__dir, 'acceptance/basic-prose.ts')
    const expectedOut = input.replace('.ts', '.md')
    try {
      unlinkSync(expectedOut)
    } catch {}
    const { stdout } = runCli(['--dryrun', input])
    assert.ok(stdout.includes('dry run: would write'), 'prints dry run message')
    assert.ok(!existsSync(expectedOut), 'does not write file')
  })

  test('--test: runs tests and proceeds to generate on success', () => {
    const input = join(__dir, 'acceptance/basic-prose.ts')
    const outputFile = input.replace('.ts', '.generated.md')
    try {
      const { stdout } = runCli(['--test', '--out', outputFile, input])
      assert.ok(stdout.includes('wrote'), 'generated file')
      assert.ok(existsSync(outputFile))
    } finally {
      try { unlinkSync(outputFile) } catch {}
    }
  })

  test('--typecheck: succeeds on valid .ts file', () => {
    const input = join(__dir, 'acceptance/basic-prose.ts')
    const outputFile = input.replace('.ts', '.generated.md')
    try {
      const { stdout } = runCli(['--typecheck', '--dryrun', input])
      assert.ok(stdout.includes('dry run: would write'))
    } finally {
      try { unlinkSync(outputFile) } catch {}
    }
  })

  test('--typecheck: errors on .js file', () => {
    const input = join(__dir, 'acceptance/javascript-basics.js')
    const { stderr, status } = runCli(['--typecheck', '--dryrun', input], { expectFail: true })
    assert.equal(status, 1)
    assert.ok(stderr.includes('--typecheck requires .ts files'))
  })

})

