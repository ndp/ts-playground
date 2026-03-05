/*
# @ndp-software/lit-md

Literate test files that generate `README.md`s.

Some projects require quite detailed examples, and it can be challenging
to keep them up-to-date and correct in documentation. With lit-md,
write your documentation as a TypeScript or JavaScript test file.
lit-md generates the markdown after your tests have verified
that every example actually works.

There are other tools with the same aims (e.g. docco, literate.js),
but this follows in the Literate programming tradition but updated
for the Typescript and TDD era.

lit-md is designed to work with Node's built-in test runner and
assertion library. Typescript is optional but fully-supported.

```sh
node --test README.md.test.ts   # run examples as tests
tsc README.md.test.ts           # typecheck
lit-md README.md.test.ts        # generate README.md
lit-md --test --typecheck README.md.test.ts  # all-in-one!
```
*/

import {describe, example, shell, shellExample, alias, stripTypesFlag} from '../src/index.ts'

const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

/*
## How it works

A lit-md file contain prose in comments and examples in test bodies.
At a basic level, a file is processed and comments are directly transferred
into markdown, with examples bodies becoming fenced code blocks.
To make this work well, there are quite a few nuances and features to control
what appears in the output and how it looks.


## Core concepts

### Comments become prose

Line and block comments both become markdown.
*/
shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `/*\n * # Section\n * \n * A description.\n */`
  }],
  outputFiles: [{
    path: 'tmp.md'
  }]
})
// Comments with the `//` prefix are also supported.

// ### example() bodies become code blocks
//
// The body of each example call becomes a fenced code block.

shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `import { example } from 'node:test'\nimport assert from 'node:assert/strict'\n\nexample('greet', () => {\n  const msg = 'Hello, world!'\n  assert.equal(msg.length, 13)\n})`
  }],
  outputFiles: [{
    path: 'tmp.md'
  }]
})

/*
### describe() and imports are hidden by default

Imports, describe() and non-example code are stripped from the output by default,
but they still run and can be used inside examples.
*/
shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `import { describe, example } from 'node:test'\nimport assert from 'node:assert/strict'\n\ndescribe('Math tests', () => {\n  example('add', () => {\n    const x = 1 + 1\n    assert.equal(x, 2)\n  })\n})`
  }],
  outputFiles: [{
    path: 'tmp.md',
    contains: 'const x = 1 + 1'
  }]
})
// Use `// keep` to keep an "import" relevant to the story:
shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `import { example } from 'node:test'\nimport { greet } from './greet.ts' // keep\n\nexample('test', () => {\n  const msg = greet('world')\n})`
  }],
  outputFiles: [{
    path: 'tmp.md',
    contains: "import { greet }"
  }]
})
// Functions and variables defined outside `example()` don't appear in output.
// They run and can be called inside examples, but stay out of the docs.
shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `import { example } from 'node:test'\nimport assert from 'node:assert/strict'\n\nexample('greet', () => {\n  const msg = greet('world')\n  assert.equal(msg, 'Hello, world!')\n})\n\nfunction greet(name: string) { return \`Hello, \${name}!\` }`
  }],
  outputFiles: [{
    path: 'tmp.md',
    contains: "const msg = greet('world')"
  }]
})

// ## Merging imports into examples
//
// If a comment ends with a code fence and an example follows,
// they merge into one code block.

shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `import { example } from 'node:test'\nimport assert from 'node:assert/strict'\n\n// Use it like this:\n//\n// \`\`\`typescript\n// import { parse } from '@ndp-software/lit-md'\n// \`\`\`\n\nexample('example', () => {\n  const x = 1\n  assert.equal(x, 1)\n})`
  }],
  outputFiles: [{
    path: 'tmp.md',
    contains: "import { parse }"
  }, {
    path: 'tmp.md',
    contains: "const x = 1"
  }]
})

// ## Filename labels
//
// Place // file: before an `example` to add a file label in the output.

shellExample('lit-md tmp.ts', {
  displayCommand: false,
  inputFiles: [{
    path: 'tmp.ts',
    content: `// file: greet.ts\nexample('greet example', () => {\n  const msg = 'hello'\n})`
  }],
  outputFiles: [{
    path: 'tmp.md',
    contains: 'greet.ts'
  }]
})

// ## Assertion transformation
//
// Assertions inside examples are transformed to annotations:
// - assert.equal(a, b) becomes a // => b

shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `import { example } from 'node:test'\nimport assert from 'node:assert/strict'\n\nexample('equal', () => {\n  const msg = 'hello'\n  assert.equal(msg.length, 5)\n})`
  }],
  outputFiles: [{
    path: 'tmp.md',
    contains: '// => 5'
  }]
})

// ## CLI
//
// The lit-md CLI generates markdown from TypeScript or JavaScript files.

// ### Basic usage
//
// ```sh
// node ./cli.ts README.md.test.ts
// # generates README.md next to README.md.test.ts
// ```

shellExample('lit-md tmp.ts', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `// # My Document\nimport { example } from 'node:test'\nexample('test', () => {})`
  }],
  outputFiles: [{
    path: 'tmp.md',
    contains: '# My Document'
  }]
})

// ### Custom output path
//
// Use --out to write to a different location.

shellExample('lit-md tmp.ts --out /tmp/docs.md', {
  inputFiles: [{
    path: 'tmp.ts',
    content: `// # Documentation\nimport { example } from 'node:test'`
  }],
  outputFiles: [{
    path: '/tmp/docs.md',
    contains: '# Documentation'
  }]
})

// ### JavaScript files
//
// `.js` files work exactly the same way — code blocks use `js` instead of `ts`.

shellExample('lit-md tmp.js', {
  inputFiles: [{
    path: 'tmp.js',
    content: `// # My JS Doc\nimport { example } from 'node:test'\nexample('test', () => {})`
  }],
  outputFiles: [{
    path: 'tmp.md',
    contains: '# My JS Doc'
  }]
})

// ## Shell examples
//
// Use `shell` to include executable shell commands in the README.
// It's concise and verifies a 0 return code:

describe('shell tagged template', () => {
  example('basic: verify command succeeds', () => {
    shell`echo "hello world"`
  })

  // Multi-line command work, and can include comment lines:
  example('with stdout assertion', () => {
    shell`
      echo "hello"
      # => hello
    `
  })
})

// ## shellExample
// `shellExample` provides a more structured way to include shell commands,
// with support for
// -- input file generation and
// -- output file assertions, and
// -- more detailed stdout assertions.

describe('shellExample structured', () => {
  example('basic', () => {
    shellExample('echo "hello world"')
  })

  // Can contain assertions on stdout, which appear as comments in the emitted markdown.
  example('with stdout assertion', () => {
    shellExample('echo "ok"', {stdout: {contains: 'ok'}})
  })

  // Can provide input files that are created before the command runs,
  // and output file assertions that check for files created by the command and their contents.
  example('with output files', () => {
    shellExample('cp input.txt output.txt', {
      inputFiles: [{path: 'input.txt', content: 'hello world'}],
      outputFiles: [{path: 'output.txt', contains: 'hello world'}]
    })
  })

  // Output file assertions can also check that contents match a regex pattern, which is useful for larger files where you just want to verify a relevant part.
  example('with regex match', () => {
    shellExample('cp input.txt output.txt', {
      inputFiles: [{path: 'input.txt', content: 'first line\nsecond line'}],
      outputFiles: [{path: 'output.txt', matches: /^first/}]
    })
  })

  // You can even output the output file contents, or the stdout:
  example('output file contents', () => {
    shellExample('echo "Hello, World!" | tee greeting.txt', {
      stdout: {
        contains: "Hello",
        display: true /* outputs standard out after the command */
      },
      outputFiles: [{
        contains: 'Hello',
        path: 'greeting.txt',
        // display: true, /* by default display, but suppress with `display: false` */
        summary: true
      }]
    })
  })
  shellExample('echo "Hello, World!" | tee greeting.txt', {
    stdout: {contains: "Hello", display: true},
    outputFiles: [{contains: 'Hello', path: 'greeting.txt', summary: true}]
  })
})

/*
## shellExample

shellExample provides more control and structured options for shell command examples. Use when you need to:

- Capture and display stdout dynamically
- Create input files before running
- Assert output files match patterns
- Hide/customize what's displayed

### Basic Usage
*/
example('basic shellExample', () => shellExample('echo "hello world"'))
/*
### With Assertions
*/
example('contains', () => shellExample('echo "ok"', {
  stdout: {contains: 'ok'}
}))
/*
### Input and Output Files
*/
example('matches', () => shellExample('cat input.txt > output.txt', {
  inputFiles: [
    {path: 'input.txt', content: 'Hello'}
  ],
  outputFiles: [
    {path: 'output.txt', matches: /Hello/}
  ]
}))


/*
### Options Reference

#### displayCommand

- Type: boolean | 'hidden'
- When 'hidden', command is executed but not shown in output
- Default: true (command is shown)

#### stdout

- Type: { contains: string; display?: boolean }
- contains: Assert output contains this string (required)
- display: When true, dynamically execute and show actual stdout (default: false)

#### outputFiles

Array of output file assertions:

- path: File path (relative to temp directory)
- contains or matches: String or regex to match file contents
- displayPath: Show the filename (default: true)
- summary: Show summary line before contents (default: true)

#### inputFiles

Array of input files to create:

- path: File path
- content: File contents
- displayPath: Show the filename (default: true)
- summary: Show summary line (default: true)

#### Example with All Options

*/
example('all options', () =>
  shellExample(
    'cat input.txt && echo "Done" | tee result.log', {
      displayCommand: true,
      inputFiles: [
        {path: 'input.txt', content: 'Config data', displayPath: true, summary: true}
      ],
      stdout: {
        contains: 'Done',
        display: true  // Show actual output
      },
      outputFiles: [
        {path: 'result.log', matches: /Done/, displayPath: true, summary: true}
      ]
    }))