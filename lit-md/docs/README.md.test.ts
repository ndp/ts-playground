// # @ndp-software/lit-md
//
// Write your documentation as a TypeScript or JavaScript test file.
// lit-md generates the markdown after your tests have verified
// that every example actually works.
//
// ```sh
// node --test README.md.test.ts   # run examples as tests
// tsc README.md.test.ts           # typecheck
// node ./cli.ts README.md.test.ts  # generate README.md
// ```

import {describe, example, shell, shellExample, alias, stripTypesFlag} from '../src/index.ts'
import assert from 'node:assert/strict'

const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

// ## How it works
//
// A lit-md file contains:
// 1. Comments (prose) - become markdown text
// 2. example() tests - become code blocks
// 3. Assertions - become annotations
//
// The CLI processes the file:
// 1. Parse and extract comments/examples
// 2. Run as node:test tests  
// 3. Generate README.md

// ## Core concepts

// ### Comments become prose
//
// Line and block comments both become markdown.

describe('comments become prose', () => {
  shellExample('lit-md tmp.ts', {
    inputFiles: [{
      path: 'tmp.ts',
      content: `/*\n * # Section\n * \n * A description.\n */`
    }],
    outputFiles: [{
      path: 'tmp.md',
      contains: '# Section\n\nA description'
    }]
  })
})
// // comments are also supported.

// ### example() bodies become code blocks
//
// The body of each example call becomes a fenced code block.

describe('example bodies become code blocks', () => {
    shellExample('lit-md tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { example } from 'node:test'\nimport assert from 'node:assert/strict'\n\nexample('greet', () => {\n  const msg = 'Hello, world!'\n  assert.equal(msg.length, 13)\n})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: `const msg = 'Hello, world!'`
      }]
    })
})

// ### describe() is transparent
//
// describe() wrappers are stripped — only the body is kept.

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

// ### Imports are hidden by default
//
// All import lines are filtered out. Use `// keep` to show one.

    shellExample('lit-md tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { example } from 'node:test'\nimport { parse } from './parser.ts'\n\nexample('test', () => {\n  const x = 1\n})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: 'const x = 1'
      }]
    })

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

// ### Top-level helpers are invisible
//
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
// Place // file: before an example to add a label.

    shellExample('lit-md tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { example } from 'node:test'\nimport assert from 'node:assert/strict'\n\n// file: greet.ts\nexample('greet example', () => {\n  const msg = 'hello'\n})`
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
// Use shell or shellExample to include executable shell commands.

describe('shell tagged template', () => {
  example('basic: verify command succeeds', () => {
    shell`echo "hello world"`
  })

  example('with stdout assertion', () => {
    shell`
      echo "hello"
      # => hello
    `
  })
})

describe('shellExample structured', () => {
  example('basic', () => {
    shellExample('echo "hello world"')
  })

  example('with stdout assertion', () => {
    shellExample('echo "ok"', { stdout: 'ok' })
  })

  example('with output files', () => {
    shellExample('cp input.txt output.txt', {
      inputFiles: [{ path: 'input.txt', content: 'hello world' }],
      outputFiles: [{ path: 'output.txt', contains: 'hello world' }]
    })
  })

  example('with regex match', () => {
    shellExample('cp input.txt output.txt', {
      inputFiles: [{ path: 'input.txt', content: 'first line\nsecond line' }],
      outputFiles: [{ path: 'output.txt', matches: /^first/ }]
    })
  })
})
