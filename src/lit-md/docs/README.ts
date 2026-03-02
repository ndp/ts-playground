/*
# @ndp-software/lit-md

Write your documentation as a TypeScript (or JavaScript) test file.
`lit-md` generates the markdown — after your tests have verified
that every example actually works.

```sh
node --test README.ts   # run examples as tests
tsc README.ts           # typecheck
lit-md README.ts        # generate README.md
```
*/

import {describe, example, shell, shellExample} from '../index.ts'
import assert from 'node:assert/strict'
import {parse, render} from '../index.ts'

/*
## How it works

A literate file is a normal `node:test` file. The rules are simple:

| Source construct                                | Output                        |
|-------------------------------------------------|-------------------------------|
| `//` or block comments                          | Markdown prose                |
| `import …`                                      | Hidden by default             |
| `import … // keep`                              | Shown as a code block         |
| `describe(name, fn)`                            | Transparent — name dropped, body kept |
| `example(name, fn)`                             | Body → fenced code block      |
| `assert.equal(x, y)` inside a test body         | Transformed to `x // => y` |
| Comment ending with a code fence, then `example()` | Merged into one block         |
| `// file: name.ts` before a block               | Filename label on that fence  |
*/

// To use lit-md, create a TypeScript file with comments and tests, then run:
//
// ```sh
// node --test README.ts   # run examples as tests
// tsc README.ts           # typecheck
// node src/lit-md/cli.ts README.ts  # generate README.md
// ```

// ## How to use lit-md
//
// A lit-md file is a normal TypeScript file with comments and tests.
// The tool runs the file with `node --test`, then generates markdown from it.

// ### 1. Comments become prose
//
// `//` line comments and `/* block */` comments both become markdown.
// Blank `//` lines become paragraph breaks.

describe('parsing: comments', () => {
  example('line comments → prose', () => {
    const nodes = parse('// Hello, **world**.\n//\n// Second paragraph.')
    assert.deepEqual(nodes, [
      {kind: 'prose', text: 'Hello, **world**.\n\nSecond paragraph.'}
    ])
  })

  example('block comments → prose (strips leading asterisks)', () => {
    const nodes = parse('/*\n * ## Section\n *\n * A description.\n */')
    assert.deepEqual(nodes, [
      {kind: 'prose', text: '## Section\n\nA description.'}
    ])
  })
})

// ### 2. example() bodies become code blocks
//
// The body of each `example()` call becomes a fenced code block.
// The example name is stored as a fence `title` — rendered as a tab label
// in Docusaurus, silently ignored by GitHub.

describe('parsing: example bodies', () => {
  example('example body → fenced code block', () => {
    const src = `
import { example } from 'node:test'
example('greet', () => {
  const msg = 'Hello, world!'
  assert.equal(msg.length, 13)
})
`
    const nodes = parse(src)
    assert.deepEqual(nodes, [
      {kind: 'code', lang: 'typescript', text: `const msg = 'Hello, world!'\nmsg.length // => 13`, title: 'greet'}
    ])
  })
})

// ### 3. describe() is transparent
//
// `describe()` wrappers are stripped entirely. The name is discarded and
// the body is kept. Use `describe` to group related tests without affecting
// the generated docs.

describe('parsing: describe transparency', () => {
  example('describe is transparent — name is discarded', () => {
    const src = `
import { describe, example } from 'node:test'
describe('My Group', () => {
  example('inner', () => { const x = 1 })
})
`
    const nodes = parse(src)
    // Verify 'My Group' does not appear anywhere in the output
    assert.ok(!JSON.stringify(nodes).includes('My Group'))
  })
})

// ### 4. Import filtering
//
// All `import` lines are hidden by default — test infrastructure imports
// would clutter the docs. Add `// keep` to show an import:
//
// ```typescript
// import { greet } from './greet.ts' // keep   ← shown
// import { example } from 'node:test'          ← hidden
// ```

describe('parsing: import filtering', () => {
  example('imports are hidden by default', () => {
    const nodes = parse(`import { example } from 'node:test'`)
    assert.deepEqual(nodes, [])
  })

  example('// keep shows the import in a code block', () => {
    const nodes = parse(`import { greet } from './greet.ts' // keep`)
    assert.equal(nodes.length, 1)
    assert.equal(nodes[0]!.kind, 'code')
    assert.ok((nodes[0] as any).text.includes("import { greet }"))
  })
})

// ## Merging imports into examples
//
// If a comment section ends with a fenced code block **and** an `example()` follows
// immediately, the fence and the example body merge into one code block.
// This lets you show the import alongside the usage without a separate block.

describe('parsing: code block merge', () => {
  example('merged block includes both the fence and the example body', () => {
    const src = `
import { example } from 'node:test'
// Use it like this:
//
// \`\`\`typescript
// import { parse } from '@ndp-software/lit-md'
// \`\`\`
example('example', () => {
  const nodes = parse('// Hello')
  assert.equal(nodes[0]?.kind, 'prose')
})
`
    const nodes = parse(src)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.ok(code.text.includes("import { parse }"))
    assert.ok(code.text.includes("const nodes = parse"))
  })
})

// ## Filename labels
//
// Place `// file: name.ts` on the line immediately before an `example()` or a
// kept import to add a filename label to that code block.

describe('parsing: filename labels', () => {
  example('// file: sets the fence label', () => {
    const src = `
import { example } from 'node:test'
// file: greet-usage.ts
example('labeled', () => {
  const msg = greet('world')
})
`
    const nodes = parse(src)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.title, 'greet-usage.ts')
  })
})

// ## The document model
//
// `parse()` returns an array of `DocNode` objects. `render()` converts them
// to a markdown string. You can use these directly if you need custom output.

describe('rendering: document model', () => {
  example('render converts DocNode[] to a markdown string', () => {
    const md = render([
      {kind: 'prose', text: '## Example'},
      {kind: 'code', lang: 'typescript', text: 'const x = 1', title: undefined}
    ])
    assert.equal(md, '## Example\n\n```typescript\nconst x = 1\n```')
  })
})

// ## CLI
//
// The generated file ends with a trailing newline. The input file is never
// modified — `lit-md` is read-only with respect to your source.
//
// To generate documentation:
//
// ```sh
// # Write README.md next to README.ts
// node src/lit-md/cli.ts README.ts
//
// # Write to a custom path
// node src/lit-md/cli.ts README.ts --out docs/index.md
// ```

// ## Shell examples in documentation
//
// Use `shell` or `shellExample` to include executable shell examples in your
// documentation. Both helpers register an `example` test that runs the command
// and verifies any annotations at test time.
//
// Import from `@ndp-software/lit-md`:
//
// ```typescript
// import { shell, shellExample } from '@ndp-software/lit-md'
// ```

// ### `shell` — compact tagged template
//
// Best for simple, readable inline examples. Annotations live alongside the commands.
// Here's how a shell example looks in a README.ts file:
//
// ```typescript
// shell`
//   npm test
//   # => 100 tests pass
// `
// ```
//
// When parsed, it becomes a code block that documents and verifies shell commands.

describe('shell examples: parsing', () => {
  example('shell basic: just verify the command succeeds', () => {
    const nodes = parse(`shell\`echo "hello"\``)
    assert.equal(nodes[0]?.kind, 'code')
    assert.equal((nodes[0] as any).lang, 'sh')
  })

  example('shell # => example renders with annotation', () => {
    const nodes = parse('shell`\n  echo "hello world"\n  # => hello world\n`')
    assert.ok((nodes[0] as any).text.includes('# => hello world'))
  })

  example('shell # file: example renders with annotation', () => {
    const nodes = parse('shell`\n  node cli.ts README.ts\n  # file: README.md contains "# Title"\n`')
    assert.ok((nodes[0] as any).text.includes('# file: README.md'))
  })
})

// ### `shellExample` — structured function
//
// Best when assertions need explicit naming or multi-line file content.

describe('shell examples: structured', () => {
  // #### Simplest form

  example('shellExample basic renders as sh block', () => {
    const nodes = parse(`shellExample('echo "hello"', {})`)
    assert.equal((nodes[0] as any).lang, 'sh')
    assert.equal((nodes[0] as any).text, 'echo "hello"')
  })

  // #### With stdout and multi-line file output assertion

  example('shellExample with stdout and outputFiles renders annotations', () => {
    const nodes = parse(
      `shellExample('lit-md README.ts', { stdout: 'wrote README.md', outputFiles: [{ path: 'README.md', contains: '# Title\\n\\nA library.' }] })`
    )
    const text = (nodes[0] as any).text as string
    assert.ok(text.includes('# => wrote README.md'))
    assert.ok(text.includes('# output-file: README.md contains:'))
    assert.ok(text.includes('#   # Title'))
  })

  // #### With inputFiles fixture

  example('shellExample with inputFiles renders command only (no inputFiles shown)', () => {
    const nodes = parse(
      `shellExample('lit-md tmp/README.ts', { inputFiles: [{ path: 'tmp/README.ts', content: '// # Hi' }], outputFiles: [{ path: 'tmp/README.md', contains: '# Hi' }] })`
    )
    const text = (nodes[0] as any).text as string
    // The command is shown
    assert.ok(text.startsWith('lit-md tmp/README.ts'))
    // inputFiles are not shown in the rendered markdown (invisible setup)
    assert.ok(!text.includes('inputFiles'))
  })
})
