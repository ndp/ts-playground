import {
  describe,
  example,
  shell,
  shellExample,
  metaExample,
  alias,
  stripTypesFlag,
  setDescribeFormat
} from '../index.ts'
import assert from 'node:assert/strict'

const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

/*
# @ndp-software/lit-md

Literate test files that generate `README.md`s.

## Introduction

Some projects require quite detailed examples, and it can be challenging
to keep them up-to-date and correct in documentation. With lit-md,
write your documentation as a TypeScript or JavaScript test file.
lit-md generates the markdown after your tests have verified
that every example actually works.

- works with Typescript or Javascript
- generates clean markdown with minimal cruft, while still allowing
  you to include relevant code outside of examples when needed
- provides utilities to include shell commands and their outputs as part of your documentation
- supports flexible assertion methods for both code examples and shell commands,
  with options to display actual outputs in the generated markdown
- fully tested with its own test suite, which also serves as documentation and examples for users

There are other tools with the same aims (e.g. docco, literate.js),
but this follows in the Literate programming tradition but updated
for the Typescript and TDD era.

```sh
node --test README.lit-md.ts   # run examples as tests
tsc README.lit-md.ts           # typecheck
lit-md README.lit-md.ts        # generate README.md
lit-md --test --typecheck README.lit-md.ts  # all-in-one!
```
 ## How it Works
A lit-md file contain prose in comments and examples in test bodies.
At a basic level, a file is processed and comments are directly transferred
into markdown, with examples bodies becoming fenced code blocks.
To make this work well, there are quite a few nuances and features to control
what appears in the output and how it looks.
*/

describe('Core concepts', () => {
  /*
  Comments become markdown.
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
  // (Single line comments with the `//` prefix are also supported.)

  describe('example() bodies become code blocks', () => {
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
  })

  describe('Cruft is removed', () => {
    /*
    All other code, like imports, describe() blocks, and variables/functions
    defined outside examples, is hidden from output by default.
    */
    shellExample('lit-md tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        displayPath: false,
        content:
          `import { describe, example } from 'node:test'
import assert from 'node:assert/strict'

const myGlobal = 52
function adder (a: number, b: number) { a + b }

describe('Math tests', () => {
  example('add', () => {
    const x = adder(1, 1)
    assert.equal(x, 2)  
  })
})`
      }],
      outputFiles: [{
        displayPath: false,
        path: 'tmp.md'
      }]
    })

    // Use `// keep` or `// keep:full `to keep any statement or full function
    // that is relevant to the story:
    shellExample('lit-md tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { example } from 'node:test'
import { greet } from './greet.ts' // keep

example('test', () => {
  const msg = greet('world')
})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: "import { greet }"
      }]
    })
  })

  describe('Control describe() block rendering with --describe', () => {
    /*
    By default, describe() block names are hidden from output (`--describe=hidden`).
    You can render them as markdown headers using the `--describe` flag.
    When rendered as headers, nested describes become progressively deeper header levels.
    */
    shellExample('lit-md --describe="#" tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { describe, example } from 'node:test'\nimport assert from 'node:assert/strict'\n\ndescribe('User API', () => {\n  example('create user', () => {\n    const id = 1\n    assert.equal(typeof id, 'number')\n  })\n\n  describe('Validation', () => {\n    example('reject empty name', () => {\n      const valid = false\n      assert.equal(valid, false)\n    })\n  })\n})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: '# User API'
      }, {
        path: 'tmp.md',
        contains: '## Validation'
      }]
    })
    // Format options: `hidden` (default), `#`, `##`, `###`, `####`, `auto`
    // - `hidden`: Omit describes (default behavior)
    // - `#`, `##`, `###`, `####`: Explicitly set base header level for top-level describes
    // - `auto`: Dynamically determine header levels based on document structure
    //
    // With explicit levels, nested describes go one level deeper than their parent.
    // With `auto`, if no headers exist yet, describes start at h1. Otherwise,
    // describes start one level deeper than the last header in the document.

    shellExample('lit-md --describe="##" tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { describe, example } from 'node:test'\n\ndescribe('API', () => {\n  example('test', () => {})\n  describe('Nested', () => {\n    example('nested test', () => {})\n  })\n})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: '## API'
      }, {
        path: 'tmp.md',
        contains: '### Nested'
      }]
    })

    // The `auto` format intelligently adapts to existing document structure.
    shellExample('lit-md --describe="auto" tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { describe, example } from 'node:test'\n\ndescribe('First Group', () => {\n  example('test 1', () => {})\n})\n\n// # Existing Header\n\ndescribe('Second Group', () => {\n  example('test 2', () => {})\n})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: '# First Group'  // No prior headers, so starts at h1
      }, {
        path: 'tmp.md',
        contains: '## Second Group'  // After h1 header, starts at h2
      }]
    })
  })
})


describe('Filename labels', () => {
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
})

describe('Assertion transformation', () => {


  /*
  Assertions inside examples are transformed to annotations:
  - assert.equal(a, b) becomes a // => b
  */
  metaExample('assert.equals transformation', () => {
    const msg = 'hello'
    assert.equal(msg.length, 5)
  })
})


describe('Shell examples', () => {
  /*
  Use `shell` to include executable shell commands in the README.
  It's concise and verifies a 0 return code:
  */

  describe('shell template', () => {
    metaExample('basic: verify command succeeds', () => {
      shell`echo "hello world"`
    })

    // Multi-line command work, and can include comment lines:
    metaExample('with stdout assertion', () => {
      shell`
          echo "hello"
          # => hello
        `
    })
  })

  describe('shellExample', () => {
    /*
    `shellExample` provides a more structured way to include shell commands,
    with support for
    - input file generation and
    - output file assertions, and
    - more detailed stdout assertions.
    */

    example('basic', () => {
      shellExample('echo "hello world"')
    })

    // Can contain assertions on stdout, which appear as comments in the emitted markdown.
    // Assertions can use `contains` or `matches`, with either strings or regex patterns.
    example('with stdout assertion', () => {
      shellExample('echo "ok"', {stdout: {contains: 'ok'}})
    })

    // stdout.matches provides an alternative assertion method:
    example('with stdout matches', () => {
      shellExample('echo "version 1.0.0"', {stdout: {matches: /version \d+\.\d+\.\d+/}})
    })

    // Can provide input files that are created before the command runs,
    // and output file assertions that check for files created by the command and their contents.
    example('with output files', () => {
      shellExample('cp input.txt output.txt', {
        inputFiles: [{path: 'input.txt', content: 'hello world'}],
        outputFiles: [{path: 'output.txt', contains: 'hello world'}]
      })
    })

    // Output file assertions can check contents with `contains` (substring or regex) or `matches` (regex or string).
    // Both properties are optional — you can specify just one, or display file contents without assertions.
    example('with regex match', () => {
      shellExample('cp input.txt output.txt', {
        inputFiles: [{path: 'input.txt', content: 'first line\nsecond line'}],
        outputFiles: [{path: 'output.txt', matches: /^first/}]
      })
    })

    // File assertions can also use regex in contains or strings in matches:
    example('flexible assertion types', () => {
      shellExample('cp input.txt output.txt', {
        inputFiles: [{path: 'input.txt', content: 'data.json'}],
        outputFiles: [{path: 'output.txt', contains: /\.json/}]
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

    // You can also display the `shellExample` call itself in the output using the `meta` option:
    example('with meta option', () =>
      shellExample('echo "Hello, World!"', {
        meta: true,
        stdout: {}
      })
    )
    shellExample('echo "Hello, World!"', {
      meta: true,
      stdout: {}
    })
  })

  /*
  shellExample provides more control and structured options for shell command examples. Use when you need to:

  - Capture and display stdout dynamically
  - Create input files before running
  - Assert output files match patterns
  - Hide/customize what's displayed
  - Show the function call itself with `meta: true`
  */
  describe('Advanced Usage', () => {
    example('basic shellExample', () => shellExample('echo "hello world"'))
    /*
    With Assertions
    */
    example('contains', () => shellExample('echo "ok"', {
      stdout: {contains: 'ok'}
    }))
    /*
    Input and Output Files
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
    Options Reference

    #### displayCommand

    - Type: `boolean` | `'hidden'`
    - When 'hidden' or false, command is executed but not shown in output
    - Default: true (command is shown)

    #### stdout

    - Type: { contains?: string | RegExp; matches?: string | RegExp; display?: boolean }
    - `contains`: Assert output contains this string or matches regex pattern (optional)
    - `matches`: Assert output matches this string (substring) or regex pattern (optional)
    - `display`: When true, dynamically execute and show actual stdout (default: false)
    - At least one of contains/matches is typically specified, but both are optional

    #### outputFiles

    Array of output file assertions:

    - `path`: File path (relative to temp directory)
    - `contains`: String or regex to check if file contains this value (optional)
    - `matches`: String or regex to check if file matches this value (optional)
    - `displayPath`: Show the filename (default: true)
    - `summary`: Show summary line before contents (default: true)

    #### inputFiles

    Array of input files to create:

    - `path`: File path
    - `content`: File contents
    - `displayPath`: Show the filename (default: true)
    - `summary`: Show summary line (default: true)

    #### meta

    - Type: `boolean`
    - When true, outputs a fenced code block showing the `shellExample` call itself before the command output
    - The `meta: true` option is removed from the reconstructed call for cleaner documentation
    - Default: false (only shows the command and its output)
    - Useful for showing both the code and its result in documentation

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
            display: true,  // Show actual output
            matches: /Done/ // Both contains and matches are optional
          },
          outputFiles: [
            {path: 'result.log', matches: /Done/, displayPath: true, summary: true}
          ]
        }))
  })
})
