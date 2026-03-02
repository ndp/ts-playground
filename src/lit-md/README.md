# @ndp-software/lit-md

Write your documentation as a TypeScript or JavaScript test file.
lit-md generates the markdown after your tests have verified
that every example actually works.

```sh
node --test README.ts   # run examples as tests
tsc README.ts           # typecheck
node ./cli.ts README.ts  # generate README.md
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

```typescript tmp.ts
/*
 * # Section
 * 
 * A description.
 */
```

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains:
#   # Section
#
#   A description
```

// comments are also supported.
### example() bodies become code blocks

The body of each example call becomes a fenced code block.

```typescript tmp.ts
import { example } from 'node:test'
import assert from 'node:assert/strict'

example('greet', () => {
  const msg = 'Hello, world!'
  assert.equal(msg.length, 13)
})
```

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "greet"
# output-file: tmp.md contains "const msg = 'Hello, world!'"
```

### describe() is transparent

describe() wrappers are stripped - only the body is kept.

```typescript tmp.ts
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
node ./cli.ts tmp.ts
# output-file: tmp.md contains "add"
```

### Import filtering

All import lines are hidden by default. Add // keep to show an import.

```typescript tmp.ts
import { example } from 'node:test'
import { parse } from './parser.ts'

example('test', () => {
  const x = 1
})
```

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "const x = 1"
```

```typescript tmp.ts
import { example } from 'node:test'
import { greet } from './greet.ts' // keep

example('test', () => {
  const msg = greet('world')
})
```

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "import { greet }"
```

## Merging imports into examples

If a comment ends with a code fence and an example follows,
they merge into one code block.

```typescript tmp.ts
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
node ./cli.ts tmp.ts
# output-file: tmp.md contains "import { parse }"
# output-file: tmp.md contains "const x = 1"
```

## Filename labels

Place // file: before an example to add a label.

```typescript tmp.ts
import { example } from 'node:test'
import assert from 'node:assert/strict'

// file: greet.ts
example('greet example', () => {
  const msg = 'hello'
})
```

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "greet.ts"
```

## Assertion transformation

Assertions inside examples are transformed to annotations:
- assert.equal(a, b) becomes a // => b

```typescript tmp.ts
import { example } from 'node:test'
import assert from 'node:assert/strict'

example('equal', () => {
  const msg = 'hello'
  assert.equal(msg.length, 5)
})
```

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "// => 5"
```

## CLI

The lit-md CLI generates markdown from TypeScript files.
### Basic usage

```sh
node ./cli.ts README.ts
# generates README.md next to README.ts
```

```typescript tmp.ts
// # My Document
import { example } from 'node:test'
example('test', () => {})
```

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "# My Document"
```

### Custom output path

Use --out to write to a different location.

```typescript tmp.ts
// # Documentation
import { example } from 'node:test'
```

```sh
node ./cli.ts tmp.ts --out /tmp/docs.md
# output-file: /tmp/docs.md contains "# Documentation"
```

## Shell examples

Use shell or shellExample to include executable shell commands.
