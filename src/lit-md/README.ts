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

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, render } from './index.ts'

/*
## How it works

A literate file is a normal `node:test` file. The rules are simple:

| Source construct                                | Output                        |
|-------------------------------------------------|-------------------------------|
| `//` or block comments                          | Markdown prose                |
| `import …`                                      | Hidden by default             |
| `import … // keep`                              | Shown as a code block         |
| `describe(name, fn)`                            | Transparent — name dropped, body kept |
| `test(name, fn)`                                | Body → fenced code block      |
| Comment ending with a code fence, then `test()` | Merged into one block         |
| `// file: name.ts` before a block               | Filename label on that fence  |
*/
describe('transformation rules', () => {

  // ### Comments become prose
  //
  // `//` line comments and `/* block */` comments both become markdown.
  // Blank `//` lines become paragraph breaks.

  test('line comments → prose', () => {
    const nodes = parse('// Hello, **world**.\n//\n// Second paragraph.')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'Hello, **world**.\n\nSecond paragraph.' }
    ])
  })

  test('block comments → prose (strips leading asterisks)', () => {
    const nodes = parse('/*\n * ## Section\n *\n * A description.\n */')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: '## Section\n\nA description.' }
    ])
  })

  // ### test() bodies become code blocks
  //
  // The body of each `test()` call becomes a fenced code block.
  // The test name is stored as a fence `title` — rendered as a tab label
  // in Docusaurus, silently ignored by GitHub.

  test('test body → fenced code block', () => {
    const src = `
import { test } from 'node:test'
test('greet', () => {
  const msg = 'Hello, world!'
  assert.equal(msg.length, 13)
})
`
    const nodes = parse(src)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: `const msg = 'Hello, world!'\nassert.equal(msg.length, 13)`, title: 'greet' }
    ])
  })

  // ### describe() is transparent
  //
  // `describe()` wrappers are stripped entirely. The name is discarded and
  // the body is kept. Use `describe` to group related tests without affecting
  // the generated docs.

  test('describe is transparent — name is discarded', () => {
    const src = `
import { describe, test } from 'node:test'
describe('My Group', () => {
  test('inner', () => { const x = 1 })
})
`
    const nodes = parse(src)
    // Verify 'My Group' does not appear anywhere in the output
    assert.ok(!JSON.stringify(nodes).includes('My Group'))
  })

  // ### Import filtering
  //
  // All `import` lines are hidden by default — test infrastructure imports
  // would clutter the docs. Add `// keep` to show an import:
  //
  // ```typescript
  // import { greet } from './greet.ts' // keep   ← shown
  // import { test } from 'node:test'             ← hidden
  // ```

  test('imports are hidden by default', () => {
    const nodes = parse(`import { test } from 'node:test'`)
    assert.deepEqual(nodes, [])
  })

  test('// keep shows the import in a code block', () => {
    const nodes = parse(`import { greet } from './greet.ts' // keep`)
    assert.equal(nodes.length, 1)
    assert.equal(nodes[0]!.kind, 'code')
    assert.ok((nodes[0] as any).text.includes("import { greet }"))
  })

})

// ## Merging imports into examples
//
// If a comment section ends with a fenced code block **and** a `test()` follows
// immediately, the fence and the test body merge into one code block.
// This lets you show the import alongside the usage without a separate block.
//
// The comment below ends with a fence, so it merges with the next test:
//
// ```typescript
// import { parse } from '@ndp-software/lit-md'
// ```

describe('code merge', () => {
  test('merged block includes both the fence and the test body', () => {
    const src = `
import { test } from 'node:test'
// Use it like this:
//
// \`\`\`typescript
// import { parse } from '@ndp-software/lit-md'
// \`\`\`
test('example', () => {
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
// Place `// file: name.ts` on the line immediately before a `test()` or a
// kept import to add a filename label to that code block.

describe('filename labels', () => {

  // file: greet-usage.ts
  test('// file: sets the fence label', () => {
    const src = `
import { test } from 'node:test'
// file: greet-usage.ts
test('labeled', () => {
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

describe('document model', () => {

  test('render converts DocNode[] to a markdown string', () => {
    const md = render([
      { kind: 'prose', text: '## Example' },
      { kind: 'code', lang: 'typescript', text: 'const x = 1', title: undefined }
    ])
    assert.equal(md, '## Example\n\n```typescript\nconst x = 1\n```')
  })

})

// ## CLI
//
// ```sh
// # Write README.md next to README.ts
// lit-md README.ts
//
// # Write to a custom path
// lit-md README.ts --out docs/index.md
// ```
//
// The generated file ends with a trailing newline. The input file is never
// modified — `lit-md` is read-only with respect to your source.
