// # Shell Commands: `shellExample`
//
// lit-md provides two ways to embed executable shell commands in documentation:
// the `shell` tagged template and the `shellExample` structured function.
// Both run the command as a test and emit a `sh` code block.

import {shellExample} from '../../src/index.ts'

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
shellExample('cp input.txt output.txt', {
  inputFiles: [{
    path: 'input.txt',
    content: 'hello world'
  }],
  outputFiles: [
    {path: 'output.txt', contains: 'hello world'}
  ]
})

// File contents can assert that they match a regex pattern:
shellExample('cp input.txt output.txt', {
  inputFiles: [{
    path: 'input.txt',
    content: 'first line\nsecond line'
  }],
  outputFiles: [
    {path: 'output.txt', matches: /^first/}
  ]
})

// Larger files will display nicely in the emitted markdown, and regex assertions can verify just the relevant part:
shellExample('sort input.txt >output.txt', {
  inputFiles: [{
    path: 'input.txt',
    content: 'first line\nsecond line\nthird line\nfourth line'
  }],
  outputFiles: [
    {path: 'output.txt', matches: /^first/}
  ]
})

// ## Output Files Without Assertions
//
// You can also display output file contents without any `contains` or `matches` assertion:
shellExample('echo "Hello, World!" > greeting.txt', {
  outputFiles: [
    {path: 'greeting.txt'}
  ]
})

// ## Stdout will output to the console
shellExample('node ./src/lit-md.js --help', {})

// Sometimes file names are not important
shellExample('sort input.txt >output.txt', {
  displayCommand: false,
  inputFiles: [{
    path: 'input.txt',
    displayPath: true,
    content: 'first line\nsecond line\nthird line\nfourth line'
  }],
  outputFiles: [
    {
      path: 'output.txt',
      displayPath: true,
      matches: /^first/
    }
  ]
})
