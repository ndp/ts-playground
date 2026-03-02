// # Shell Commands
//
// lit-md provides two ways to embed executable shell commands in documentation:
// the `shell` tagged template and the `shellExample` structured function.
// Both run the command as a test and emit a `sh` code block.

import { shellExample } from '../../index.ts'


// ## shellExample — Basic

shellExample('echo "ok"', {
  stdout: 'ok'
})

// ## shellExample — With stdout Assertion

shellExample('node --version', {
  stdout: 'v'
})

// ## shellExample — With Output Files
//
// `outputFiles` verifies that specified files exist after the command runs
// and contain expected content.

shellExample('node cli.ts tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: '// # Hello\nimport { example } from \'node:test\'\nexample(\'t\', () => {})'
  }],
  outputFiles: [
    { path: 'tmp.md', contains: '# Hello' }
  ]
})

// ## shellExample — With Regex Match

shellExample('node cli.ts tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: '// ## Section\nimport { example } from \'node:test\''
  }],
  outputFiles: [
    { path: 'tmp.md', matches: /^## Section/ }
  ]
})
