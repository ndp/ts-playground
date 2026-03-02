import { describe, test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { _runShellExample, _runShell } from './shell.ts'

describe('shellExample: runtime behaviour', () => {

  test('succeeds when command exits 0', () => {
    _runShellExample('echo "hello"', {})
  })

  test('throws when command exits non-zero', () => {
    assert.throws(() => _runShellExample('exit 1', {}), /Command failed/)
  })

  test('succeeds when stdout contains expected string', () => {
    _runShellExample('echo "hello world"', { stdout: 'hello world' })
  })

  test('throws when stdout does not contain expected string', () => {
    assert.throws(
      () => _runShellExample('echo "hello"', { stdout: 'goodbye' }),
      /stdout did not contain/
    )
  })

})

describe('shellExample: outputFiles assertions', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lit-md-test-'))

  after(() => rmSync(tmp, { recursive: true, force: true }))

  test('succeeds when output file contains expected string', () => {
    const outFile = join(tmp, 'out.txt')
    _runShellExample(`echo "hello world" > "${outFile}"`, {
      outputFiles: [{ path: outFile, contains: 'hello' }]
    })
  })

  test('throws when output file does not contain expected string', () => {
    const outFile = join(tmp, 'out2.txt')
    writeFileSync(outFile, 'nothing here')
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, contains: 'expected text' }] }),
      /does not contain/
    )
  })

  test('succeeds when output file matches regex', () => {
    const outFile = join(tmp, 'out3.txt')
    _runShellExample(`echo "version 1.2.3" > "${outFile}"`, {
      outputFiles: [{ path: outFile, matches: /version \d+\.\d+\.\d+/ }]
    })
  })

  test('throws when output file does not match regex', () => {
    const outFile = join(tmp, 'out4.txt')
    writeFileSync(outFile, 'no version here')
    assert.throws(
      () => _runShellExample(`cat "${outFile}"`, { outputFiles: [{ path: outFile, matches: /version \d+/ }] }),
      /does not match/
    )
  })

})

describe('shellExample: inputFiles fixtures', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lit-md-fixtures-'))

  after(() => rmSync(tmp, { recursive: true, force: true }))

  test('creates input file before running command', () => {
    const inFile = join(tmp, 'input.txt')
    const outFile = join(tmp, 'output.txt')
    _runShellExample(`cat "${inFile}" > "${outFile}"`, {
      inputFiles: [{ path: inFile, content: 'hello from fixture' }],
      outputFiles: [{ path: outFile, contains: 'hello from fixture' }]
    })
  })

  test('cleans up input files after command runs', () => {
    const inFile = join(tmp, 'cleanup-test.txt')
    _runShellExample(`cat "${inFile}"`, {
      inputFiles: [{ path: inFile, content: 'temporary' }]
    })
    assert.throws(() => readFileSync(inFile), /no such file/, 'input file should be deleted after test')
  })

})

describe('shell tagged template: runtime behaviour', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lit-md-shell-'))

  after(() => rmSync(tmp, { recursive: true, force: true }))

  test('shell template passes on exit 0', () => {
    _runShell('echo "hello"')
  })

  test('shell template with # => asserts stdout substring', () => {
    _runShell('echo "hello world"\n# => hello world')
  })

  test('shell template with # => fails when stdout does not match', () => {
    assert.throws(
      () => _runShell('echo "hello"\n# => goodbye'),
      /stdout did not contain/
    )
  })

  test('shell template with # file: asserts output file contains text', () => {
    const outFile = join(tmp, 'shell-file.txt')
    _runShell(`echo "content" > "${outFile}"\n# file: ${outFile} contains "content"`)
  })

  test('shell template with # file: fails when file does not contain text', () => {
    const outFile = join(tmp, 'shell-file2.txt')
    writeFileSync(outFile, 'wrong content')
    assert.throws(
      () => _runShell(`cat "${outFile}"\n# file: ${outFile} contains "expected"`),
      /does not contain/
    )
  })

  test('multi-command block: both commands run, # => checks combined stdout', () => {
    _runShell('echo "first"\necho "second"\n# => first')
  })

})
