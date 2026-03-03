// # @ndp-software/lit-md
//
// Write your documentation as a TypeScript or JavaScript test file.
// lit-md generates the markdown after your tests have verified
// that every example actually works.
//
// ```sh
// node --test README.ts   # run examples as tests
// tsc README.ts           # typecheck
// node ./cli.ts README.ts  # generate README.md
// ```

import {describe, example, shell, shellExample} from '../src/index.ts'
import assert from 'node:assert/strict'

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
  shellExample('node ./cli.ts tmp.ts', {
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
    shellExample('node ./cli.ts tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { example } from 'node:test'\nimport assert from 'node:assert/strict'\n\nexample('greet', () => {\n  const msg = 'Hello, world!'\n  assert.equal(msg.length, 13)\n})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: 'greet'
      }, {
        path: 'tmp.md',
        contains: `const msg = 'Hello, world!'`
      }]
    })
})

// ### describe() is transparent
//
// describe() wrappers are stripped — only the body is kept.

    shellExample('node ./cli.ts tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { describe, example } from 'node:test'\nimport assert from 'node:assert/strict'\n\ndescribe('Math tests', () => {\n  example('add', () => {\n    const x = 1 + 1\n    assert.equal(x, 2)\n  })\n})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: 'add'
      }]
    })

// ### Imports are hidden by default
//
// All import lines are filtered out. Use `// keep` to show one.

    shellExample('node ./cli.ts tmp.ts', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `import { example } from 'node:test'\nimport { parse } from './parser.ts'\n\nexample('test', () => {\n  const x = 1\n})`
      }],
      outputFiles: [{
        path: 'tmp.md',
        contains: 'const x = 1'
      }]
    })

    shellExample('node ./cli.ts tmp.ts', {
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

    shellExample('node ./cli.ts tmp.ts', {
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

    shellExample('node ./cli.ts tmp.ts', {
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

    shellExample('node ./cli.ts tmp.ts', {
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

    shellExample('node ./cli.ts tmp.ts', {
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
// The lit-md CLI generates markdown from TypeScript files.

// ### Basic usage
//
// ```sh
// node ./cli.ts README.ts
// # generates README.md next to README.ts
// ```

    shellExample('node ./cli.ts tmp.ts', {
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

    shellExample('node ./cli.ts tmp.ts --out /tmp/docs.md', {
      inputFiles: [{
        path: 'tmp.ts',
        content: `// # Documentation\nimport { example } from 'node:test'`
      }],
      outputFiles: [{
        path: '/tmp/docs.md',
        contains: '# Documentation'
      }]
})

// ## Shell examples
//
// Use shell or shellExample to include executable shell commands.

describe('shell tagged template', () => {
  example('shell basic: verify command succeeds', () => {
    // In documentation: shell`echo "hello"`
    // This runs and verifies the command succeeds
  })

  example('shell with stdout assertion', () => {
    // shell`echo "hello"\n# => hello`
    // Verifies stdout contains the expected output
  })

  example('shell with file assertion', () => {
    // shell`node cli.ts README.ts\n# file: README.md contains "# Title"`
    // Verifies output files contain expected content
  })
})

describe('shellExample structured', () => {
  example('shellExample basic', () => {
    // shellExample('echo "hello"', {})
    // Runs command and verifies exit code 0
  })

  example('shellExample with stdout', () => {
    // shellExample('npm test', { stdout: 'passed' })
    // Verifies stdout contains "passed"
  })

  example('shellExample with output files', () => {
    // shellExample('npm run build', {
    //   outputFiles: [{path: 'dist/index.js', contains: 'export'}]
    // })
    // Verifies output files exist with expected content
  })

  example('shellExample with input files', () => {
    // shellExample('node tmp.ts', {
    //   inputFiles: [{path: 'tmp.ts', content: 'console.log("hi")'}]
    // })
    // Creates input files, runs command, cleans up after
  })
})
