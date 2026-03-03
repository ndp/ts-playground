// # Shell Commands: `shellExample`
//
// lit-md provides two ways to embed executable shell commands in documentation:
// the `shell` tagged template and the `shellExample` structured function.
// Both run the command as a test and emit a `sh` code block.

import {shellExample, alias} from '../../../src/index.ts'
alias('lit-md', 'node --experimental-strip-types ../../cli.ts')

//
// ## Basic
//
// Using `shellExample('echo "ok"')` produces:
shellExample('echo "ok"')

// ## With stdout Assertion
//
// Using `shellExample('node --version', { stdout: '24.11.0'})` produces:
shellExample('node --version', {stdout: '24.11.0'})

// ## With Input and Output Files
//
// `inputFiles` (optionally) creates a file of a given name with specific content
// `outputFiles` verifies that specified files exist after the command runs
// and contain expected content.
shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: '// # Hello\nimport { example } from \'node:test\'\nexample(\'t\', () => {})'
  }],
  outputFiles: [
    {path: 'tmp.md', contains: '# Hello'}
  ]
})

// File contents can assert that they match a regex pattern:
shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: '// ## Section\nimport { example } from \'node:test\''
  }],
  outputFiles: [
    {path: 'tmp.md', matches: /^## Section/}
  ]
})
