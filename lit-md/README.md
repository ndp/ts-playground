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

A lit-md file contain prose in comments and examples in test bodies.
At a basic level, a file is processed and comments are directly transferred
into markdown, with examples bodies becoming fenced code blocks.
To make this work well, there are quite a few nuances and features to control
what appears in the output and how it looks.


## Core concepts

### Comments become prose

Line and block comments both become markdown.

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

Comments with the `//` prefix are also supported.

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

### describe() and imports are hidden by default

Imports, describe() and non-example code are stripped from the output by default,
but they still run and can be used inside examples.

```ts
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
$ lit-md tmp.ts
```

Output file `tmp.md` contains `const x = 1 + 1`:
````markdown
```ts
const x = 1 + 1
x // => 2
```
````

Use `// keep` to keep an "import" relevant to the story:

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

Functions and variables defined outside `example()` don't appear in output.
They run and can be called inside examples, but stay out of the docs.

```ts
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
$ lit-md tmp.ts
```

Output file `tmp.md` contains `const msg = greet('world')`:
````markdown
```ts
const msg = greet('world')
msg // => 'Hello, world!'
```
````

## Merging imports into examples

If a comment ends with a code fence and an example follows,
they merge into one code block.

````ts
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
````

```sh
$ lit-md tmp.ts
```

Output file `tmp.md` contains `import { parse }`:
````markdown
Use it like this:

```ts
import { parse } from '@ndp-software/lit-md'
const x = 1
x // => 1
```
````

Output file `tmp.md` contains `const x = 1`:
````markdown
Use it like this:

```ts
import { parse } from '@ndp-software/lit-md'
const x = 1
x // => 1
```
````

## Filename labels

Place // file: before an `example` to add a file label in the output.

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
// Input file "tmp.ts":
import { example } from 'node:test'
import assert from 'node:assert/strict'

example('equal', () => {
  const msg = 'hello'
  assert.equal(msg.length, 5)
})
```

```sh
$ lit-md tmp.ts
```

Output file `tmp.md` contains `// => 5`:
````markdown
```ts
const msg = 'hello'
msg.length // => 5
```
````

## CLI

The lit-md CLI generates markdown from TypeScript or JavaScript files.

### Basic usage

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

### JavaScript files

`.js` files work exactly the same way — code blocks use `js` instead of `ts`.

```js
// Input file "tmp.js":
// # My JS Doc
import { example } from 'node:test'
example('test', () => {})
```

```sh
$ lit-md tmp.js
```

Output file `tmp.md` contains `# My JS Doc`:
```markdown
# My JS Doc
```

## Shell examples

Use `shell` to include executable shell commands in the README.
It's concise and verifies a 0 return code:

```ts
shell`echo "hello world"`
```

Multi-line command work, and can include comment lines:

```ts
shell`
  echo "hello"
  # => hello
`
```

## shellExample
`shellExample` provides a more structured way to include shell commands,
with support for
-- input file generation and
-- output file assertions, and
-- more detailed stdout assertions.

```ts
shellExample('echo "hello world"')
```

Can contain assertions on stdout, which appear as comments in the emitted markdown.

```ts
shellExample('echo "ok"', {stdout: {contains: 'ok'}})
```

Can provide input files that are created before the command runs,
and output file assertions that check for files created by the command and their contents.

```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'hello world'}],
  outputFiles: [{path: 'output.txt', contains: 'hello world'}]
})
```

Output file assertions can also check that contents match a regex pattern, which is useful for larger files where you just want to verify a relevant part.

```ts
shellExample('cp input.txt output.txt', {
  inputFiles: [{path: 'input.txt', content: 'first line\nsecond line'}],
  outputFiles: [{path: 'output.txt', matches: /^first/}]
})
```

You can even output the output file contents, or the stdout:

```ts
shellExample('echo "Hello, World!" | tee greeting.txt', {
  stdout: {
    contains:"Hello",
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
