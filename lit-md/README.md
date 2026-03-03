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
## How it works

A lit-md file contains:
1. Comments (prose) - become markdown text
2. example() tests - become code blocks
3. Assertions - become annotations

The CLI processes the file:
1. Parse and extract comments/examples
2. Run as node:test tests
3. Generate README.md

## Core concepts

### Comments become prose

Line and block comments both become markdown.

```ts tmp.ts
// Input file "tmp.ts":
/*
 * # Section
 * 
 * A description.
 */
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains:

```markdown
# Section

A description
```

// comments are also supported.

### example() bodies become code blocks

The body of each example call becomes a fenced code block.

```ts tmp.ts
// Input file "tmp.ts":
import { example } from 'node:test'
import assert from 'node:assert/strict'

example('greet', () => {
  const msg = 'Hello, world!'
  assert.equal(msg.length, 13)
})
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "const msg = 'Hello, world!'"

### describe() and imports are hidden by default

Imports, describe() and non-example code are stripped from the output by default,
but they still run and can be used inside examples.

```ts tmp.ts
// Input file "tmp.ts":
import { describe, example } from 'node:test'
import assert from 'node:assert/strict'

describe('Math tests', () => {
  example('add', () => {
    const x = 1 + 1
    assert.equal(x, 2)
  })
})
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "const x = 1 + 1"

Use `// keep` to show one.

```ts tmp.ts
// Input file "tmp.ts":
import { example } from 'node:test'
import { greet } from './greet.ts' // keep

example('test', () => {
  const msg = greet('world')
})
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "import { greet }"

Functions and variables defined outside `example()` don't appear in output.
They run and can be called inside examples, but stay out of the docs.

```ts tmp.ts
// Input file "tmp.ts":
import { example } from 'node:test'
import assert from 'node:assert/strict'

example('greet', () => {
  const msg = greet('world')
  assert.equal(msg, 'Hello, world!')
})

function greet(name: string) { return `Hello, ${name}!` }
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "const msg = greet('world')"

## Merging imports into examples

If a comment ends with a code fence and an example follows,
they merge into one code block.

```ts tmp.ts
// Input file "tmp.ts":
import { example } from 'node:test'
import assert from 'node:assert/strict'

// Use it like this:
//
// ```typescript
// import { parse } from '@ndp-software/lit-md'
// ```

example('example', () => {
  const x = 1
  assert.equal(x, 1)
})
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "import { parse }"

Output file `tmp.md` contains "const x = 1"

## Filename labels

Place // file: before an example to add a label.

```ts tmp.ts
// Input file "tmp.ts":
import { example } from 'node:test'
import assert from 'node:assert/strict'

// file: greet.ts
example('greet example', () => {
  const msg = 'hello'
})
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "greet.ts"

## Assertion transformation

Assertions inside examples are transformed to annotations:
- assert.equal(a, b) becomes a // => b

```ts tmp.ts
// Input file "tmp.ts":
import { example } from 'node:test'
import assert from 'node:assert/strict'

example('equal', () => {
  const msg = 'hello'
  assert.equal(msg.length, 5)
})
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "// => 5"

## CLI

The lit-md CLI generates markdown from TypeScript or JavaScript files.

### Basic usage

```sh
node ./cli.ts README.md.test.ts
# generates README.md next to README.md.test.ts
```

```ts tmp.ts
// Input file "tmp.ts":
// # My Document
import { example } from 'node:test'
example('test', () => {})
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "# My Document"

### Custom output path

Use --out to write to a different location.

```ts tmp.ts
// Input file "tmp.ts":
// # Documentation
import { example } from 'node:test'
```

```sh
lit-md tmp.ts --out /tmp/docs.md
```

Output file `/tmp/docs.md` contains "# Documentation"

### JavaScript files

`.js` files work exactly the same way — code blocks use `js` instead of `ts`.

```js tmp.js
// Input file "tmp.js":
// # My JS Doc
import { example } from 'node:test'
example('test', () => {})
```

```sh
lit-md tmp.js
```

Output file `tmp.md` contains "# My JS Doc"

## Shell examples

Use shell or shellExample to include executable shell commands.

```ts
shell`echo "hello world"`
```

```ts
shell`
  echo "hello"
  # => hello
`
```

```ts
shellExample('echo "hello world"')
```

```ts
shellExample('echo "ok"', {stdout: 'ok'})
```

```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'hello world'}],
  outputFiles: [{path: 'output.txt', contains: 'hello world'}]
})
```

```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'first line\nsecond line'}],
  outputFiles: [{path: 'output.txt', matches: /^first/}]
})
```
