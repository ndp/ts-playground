// # Shell Commands
//
// lit-md provides the `shellExample` function to embed executable shell commands in documentation.
// It runs the command as a test and emits a `sh` code block.

import { shellExample } from '../../src/index.ts'

// ## Basic Commands
//
// Use `shellExample('command')` to run a command and verify it exits successfully.

shellExample('echo "hello world"')

// ### Asserting stdout
//
// Use `stdout: { contains: '...' }` to assert that stdout contains a substring.

shellExample('echo "ready"', {
  stdout: { contains: 'ready' }
})

// ### Asserting file output
//
// Use `outputFiles` to assert that a file created by the command contains expected content.

shellExample('echo "hello" > greeting.txt', {
  outputFiles: [
    { path: 'greeting.txt', contains: 'hello' }
  ]
})

// ## Multiple Commands
//
// Join multiple commands with `&&` to run them in sequence and emit a single `sh` block.

shellExample('echo "first" && echo "second"')