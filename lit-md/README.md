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
node --test README.md.test.ts   # run examples as tests
tsc README.md.test.ts           # typecheck
lit-md README.md.test.ts        # generate README.md
lit-md --test --typecheck README.md.test.ts  # all-in-one!
```
 ## How it Works
A lit-md file contain prose in comments and examples in test bodies.
At a basic level, a file is processed and comments are directly transferred
into markdown, with examples bodies becoming fenced code blocks.
To make this work well, there are quite a few nuances and features to control
what appears in the output and how it looks.

## Core concepts

Comments become markdown.

```ts
// Input file "tmp.ts":
/*
 * # Section
 * 
 * A description.
 */
```

```sh
$ lit-md tmp.ts
```

Output file `tmp.md`:
```markdown
# Section

A description.
```

(Single line comments with the `//` prefix are also supported.)

### example() bodies become code blocks

The body of each example call becomes a fenced code block.

```ts
// Input file "tmp.ts":
import { example } from 'node:test'
import assert from 'node:assert/strict'

example('greet', () => {
  const msg = 'Hello, world!'
  assert.equal(msg.length, 13)
})
```

```sh
$ lit-md tmp.ts
```

Output file `tmp.md`:
````markdown
```ts
const msg = 'Hello, world!'
msg.length // => 13
```
````

### Cruft is removed

All other code, like imports, describe() blocks, and variables/functions
    defined outside examples, is hidden from output by default.

```ts
import { describe, example } from 'node:test'
import assert from 'node:assert/strict'

const myGlobal = 52
function adder (a: number, b: number) { a + b }

describe('Math tests', () => {
  example('add', () => {
    const x = adder(1, 1)
    assert.equal(x, 2)  
  })
})
```

```sh
$ lit-md tmp.ts
```

Output:
````markdown


```ts
const x = adder(1, 1)
x // => 2
```
````

Use `// keep` or `// keep:full `to keep any statement or full function
that is relevant to the story:

```ts
// Input file "tmp.ts":
import { example } from 'node:test'
import { greet } from './greet.ts' // keep

example('test', () => {
  const msg = greet('world')
})
```

```sh
$ lit-md tmp.ts
```

Output file `tmp.md` contains `import { greet }`:
````markdown
```ts
import { greet } from './greet.ts'

const msg = greet('world')
```
````

### Control describe() block rendering with --describe

By default, describe() block names are hidden from output (`--describe=hidden`).
    You can render them as markdown headers using the `--describe` flag.
    When rendered as headers, nested describes become progressively deeper header levels.

```ts
// Input file "tmp.ts":
import { describe, example } from 'node:test'
import assert from 'node:assert/strict'

describe('User API', () => {
  example('create user', () => {
    const id = 1
    assert.equal(typeof id, 'number')
  })

  describe('Validation', () => {
    example('reject empty name', () => {
      const valid = false
      assert.equal(valid, false)
    })
  })
})
```

```sh
$ lit-md --describe="#" tmp.ts
```

Output file `tmp.md` contains `# User API`:
````markdown
# User API

```ts
const id = 1
typeof id // => 'number'
```

## Validation

```ts
const valid = false
valid // => false
```
````

Output file `tmp.md` contains `## Validation`:
````markdown
# User API

```ts
const id = 1
typeof id // => 'number'
```

## Validation

```ts
const valid = false
valid // => false
```
````

Format options: `hidden` (default), `#`, `##`, `###`, `####`, `auto`
- `hidden`: Omit describes (default behavior)
- `#`, `##`, `###`, `####`: Explicitly set base header level for top-level describes
- `auto`: Dynamically determine header levels based on document structure

With explicit levels, nested describes go one level deeper than their parent.
With `auto`, if no headers exist yet, describes start at h1. Otherwise,
describes start one level deeper than the last header in the document.

```ts
// Input file "tmp.ts":
import { describe, example } from 'node:test'

describe('API', () => {
  example('test', () => {})
  describe('Nested', () => {
    example('nested test', () => {})
  })
})
```

```sh
$ lit-md --describe="##" tmp.ts
```

Output file `tmp.md` contains `## API`:
```markdown
## API

### Nested
```

Output file `tmp.md` contains `### Nested`:
```markdown
## API

### Nested
```

The `auto` format intelligently adapts to existing document structure.

```ts
// Input file "tmp.ts":
import { describe, example } from 'node:test'

describe('First Group', () => {
  example('test 1', () => {})
})

// # Existing Header

describe('Second Group', () => {
  example('test 2', () => {})
})
```

```sh
$ lit-md --describe="auto" tmp.ts
```

Output file `tmp.md` contains `# First Group`:
```markdown
# First Group

# Existing Header

## Second Group
```

Output file `tmp.md` contains `## Second Group`:
```markdown
# First Group

# Existing Header

## Second Group
```

## Filename labels

```ts
// Input file "tmp.ts":
// file: greet.ts
example('greet example', () => {
  const msg = 'hello'
})
```

Output file `tmp.md` contains `greet.ts`:
````markdown
```ts greet.ts
const msg = 'hello'
```
````

## Assertion transformation

Assertions inside examples are transformed to annotations:
  - assert.equal(a, b) becomes a // => b

```ts
example('assert.equals transformation', () => {
  const msg = 'hello'
  assert.equal(msg.length, 5)
})
```
becomes
````md
```ts
const msg = 'hello'
msg.length // => 5
```
````

## CLI

The lit-md CLI is used to do the transformations.
    ```sh
    node ./cli.ts README.md.test.ts
    # generates README.md next to README.md.test.ts
    ```

```ts
// Input file "tmp.ts":
// # My Document
import { example } from 'node:test'
example('test', () => {})
```

```sh
$ lit-md tmp.ts
```

Output file `tmp.md` contains `# My Document`:
```markdown
# My Document
```

### Custom output path

Use --out to write to a different location.

```ts
// Input file "tmp.ts":
// # Documentation
import { example } from 'node:test'
```

```sh
$ lit-md tmp.ts --out /tmp/docs.md
```

Output file `/tmp/docs.md` contains `# Documentation`.

Use lit-md --help for a options.

```sh
$ lit-md --help
lit-md - Generate markdown documentation from test files

Usage: lit-md [options] <file.ts|js> [file2 ...]

Options:
  --help, -h                Show this help message
  --test                    Run tests before generating markdown
  --typecheck               Run type checking before generating markdown
  --dryrun                  Show what would be written without writing files
  -u, --update-snapshots    Update snapshot files instead of generating markdown
  --out <output.md>         Write to a specific output file (requires single input)
  --outputDir <dir>         Write generated markdown files to this directory
  --describe <format>       Control describe() block rendering (default: hidden)
                            Formats:
                              hidden  - Omit describes (default)
                              #       - Render as h1 headers, nested as h2, h3, etc.
                              ##      - Render as h2 headers, nested as h3, h4, etc.
                              ###     - Render as h3 headers, nested as h4, h5, etc.
                              ####    - Render as h4 headers, nested as h5, h6, etc.
                              auto    - Dynamically determine level based on document structure
                                        (h1 if no headers exist, else one level deeper than last header)

Examples:
  lit-md README.md.test.ts
  lit-md --test --typecheck README.md.test.ts
  lit-md --out /tmp/docs.md README.md.test.ts
  lit-md --outputDir ./docs src/**/*.md.test.ts
  lit-md --describe="#" README.md.test.ts
  lit-md --describe="auto" README.md.test.ts
```

## Shell examples

Use `shell` to include executable shell commands in the README.
  It's concise and verifies a 0 return code:

### shell template

```ts
example('basic: verify command succeeds', () => {
  shell`echo "hello world"`
})
```
becomes
````md
```ts
shell`echo "hello world"`
```
````

Multi-line command work, and can include comment lines:

```ts
example('with stdout assertion', () => {
  shell`
      echo "hello"
      # => hello
    `
})
```
becomes
````md
```ts
shell`
    echo "hello"
    # => hello
  `
```
````

### shellExample

`shellExample` provides a more structured way to include shell commands,
    with support for
    - input file generation and
    - output file assertions, and
    - more detailed stdout assertions.

```ts
shellExample('echo "hello world"')
```

Can contain assertions on stdout, which appear as comments in the emitted markdown.
Assertions can use `contains` or `matches`, with either strings or regex patterns.

```ts
shellExample('echo "ok"', {stdout: {contains: 'ok'}})
```

stdout.matches provides an alternative assertion method:

```ts
shellExample('echo "version 1.0.0"', {stdout: {matches: /version \d+\.\d+\.\d+/}})
```

Can provide input files that are created before the command runs,
and output file assertions that check for files created by the command and their contents.

```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'hello world'}],
  outputFiles: [{path: 'output.txt', contains: 'hello world'}]
})
```

Output file assertions can check contents with `contains` (substring or regex) or `matches` (regex or string).
Both properties are optional — you can specify just one, or display file contents without assertions.

```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'first line\nsecond line'}],
  outputFiles: [{path: 'output.txt', matches: /^first/}]
})
```

File assertions can also use regex in contains or strings in matches:

```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'data.json'}],
  outputFiles: [{path: 'output.txt', contains: /\.json/}]
})
```

You can even output the output file contents, or the stdout:

```ts
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
```

```sh
$ echo "Hello, World!" | tee greeting.txt
Hello, World!
```

Output file `greeting.txt` contains `Hello`:
```
Hello, World!
```

shellExample provides more control and structured options for shell command examples. Use when you need to:

  - Capture and display stdout dynamically
  - Create input files before running
  - Assert output files match patterns
  - Hide/customize what's displayed

### Advanced Usage

```ts
shellExample('echo "hello world"')
```

With Assertions

```ts
shellExample('echo "ok"', {
      stdout: {contains: 'ok'}
    })
```

Input and Output Files

```ts
shellExample('cat input.txt > output.txt', {
      inputFiles: [
        {path: 'input.txt', content: 'Hello'}
      ],
      outputFiles: [
        {path: 'output.txt', matches: /Hello/}
      ]
    })
```

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

    #### Example with All Options

```ts
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
        })
```
