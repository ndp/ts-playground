# @ndp-software/lit-md

Write your documentation as a TypeScript (or JavaScript) test file.
`lit-md` generates the markdown — after your tests have verified
that every example actually works.

```sh
node --test README.ts   # run examples as tests
tsc README.ts           # typecheck
lit-md README.ts        # generate README.md
```
## How it works

A literate file is a normal `node:test` file. The rules are simple:

| Source construct                                | Output                        |
|-------------------------------------------------|-------------------------------|
| `//` or block comments                          | Markdown prose                |
| `import …`                                      | Hidden by default             |
| `import … // keep`                              | Shown as a code block         |
| `describe(name, fn)`                            | Transparent — name dropped, body kept |
| `test(name, fn)`                                | Body → fenced code block      |
| `assert.equal(x, y)` inside a test body         | Transformed to `x // => y` |
| Comment ending with a code fence, then `test()` | Merged into one block         |
| `// file: name.ts` before a block               | Filename label on that fence  |
### Comments become prose

`//` line comments and `/* block */` comments both become markdown.
Blank `//` lines become paragraph breaks.
### test() bodies become code blocks

The body of each `test()` call becomes a fenced code block.
The test name is stored as a fence `title` — rendered as a tab label
in Docusaurus, silently ignored by GitHub.
### describe() is transparent

`describe()` wrappers are stripped entirely. The name is discarded and
the body is kept. Use `describe` to group related tests without affecting
the generated docs.
### Import filtering

All `import` lines are hidden by default — test infrastructure imports
would clutter the docs. Add `// keep` to show an import:

```typescript
import { greet } from './greet.ts' // keep   ← shown
import { test } from 'node:test'             ← hidden
```
## Merging imports into examples

If a comment section ends with a fenced code block **and** a `test()` follows
immediately, the fence and the test body merge into one code block.
This lets you show the import alongside the usage without a separate block.

The comment below ends with a fence, so it merges with the next test:

```typescript
import { parse } from '@ndp-software/lit-md'
```
## Filename labels

Place `// file: name.ts` on the line immediately before a `test()` or a
kept import to add a filename label to that code block.
## The document model

`parse()` returns an array of `DocNode` objects. `render()` converts them
to a markdown string. You can use these directly if you need custom output.
## CLI

```sh
# Write README.md next to README.ts
lit-md README.ts

# Write to a custom path
lit-md README.ts --out docs/index.md
```

The generated file ends with a trailing newline. The input file is never
modified — `lit-md` is read-only with respect to your source.
## Command-line examples

Use `shell` or `shellExample` to include executable shell examples in your
documentation. Both helpers register a `node:test` test that runs the command
and verifies any annotations at test time.

Import from `@ndp-software/lit-md`:

```typescript
import { shell, shellExample } from '@ndp-software/lit-md'
```

### `shell` — compact tagged template

Best for simple, readable inline examples. Annotations live alongside the commands.
#### Verify exit 0 only
#### With stdout assertion (`# =>` mirrors `// =>`)
#### With output file assertion
### `shellExample` — structured function

Best when assertions need explicit naming or multi-line file content.
#### Simplest form
#### With stdout and multi-line file output assertion
#### With inputFiles fixture
