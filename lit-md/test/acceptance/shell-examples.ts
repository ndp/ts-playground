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
// Using `shellExample('node --version', { stdout: { contains: '24.11.1' }})` produces:
shellExample('node --version', {stdout: { contains: '24.11.1' }})

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

// Output files can display with only a `matches` assertion:
shellExample('echo "version 1.2.3" > version.txt', {
  outputFiles: [
    {path: 'version.txt', matches: /version \d+\.\d+\.\d+/}
  ]
})

// You can also display stdout without any assertions:
shellExample('echo "Hello, World!"', {
  stdout: {}
})

// Stdout can also use regex patterns with `matches`:
shellExample('echo "version 2.5.1"', {
  stdout: { matches: /version \d+\.\d+\.\d+/ }
})

// Stdout can use `contains` with regex patterns:
shellExample('echo "Error: file not found"', {
  stdout: { contains: /Error:/ }
})

// File assertions can use `contains` with regex patterns:
shellExample('echo "config.json" > filename.txt', {
  outputFiles: [
    {path: 'filename.txt', contains: /\.json$/}
  ]
})

// File assertions can use `matches` with strings:
shellExample('echo "success code 0" > result.txt', {
  outputFiles: [
    {path: 'result.txt', matches: 'success'}
  ]
})

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
