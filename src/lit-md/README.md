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

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "greet"
# output-file: tmp.md contains "const msg = 'Hello, world!'"
```

### describe() is transparent

describe() wrappers are stripped - only the body is kept.

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "add"
```

### Import filtering

All import lines are hidden by default. Add // keep to show an import.

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "const x = 1"
```

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "import { greet }"
```

## Merging imports into examples

If a comment ends with a code fence and an example follows,
they merge into one code block.

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "import { parse }"
# output-file: tmp.md contains "const x = 1"
```

## Filename labels

Place // file: before an example to add a label.

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "greet.ts"
```

## Assertion transformation

Assertions inside examples are transformed to annotations:
- assert.equal(a, b) becomes a // => b

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

```sh
node ./cli.ts tmp.ts
# output-file: tmp.md contains "# My Document"
```

### Custom output path

Use --out to write to a different location.

```sh
node ./cli.ts tmp.ts --out /tmp/docs.md
# output-file: /tmp/docs.md contains "# Documentation"
```

## Shell examples

Use shell or shellExample to include executable shell commands.
