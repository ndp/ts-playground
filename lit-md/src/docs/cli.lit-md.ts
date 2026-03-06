import {alias, describe, stripTypesFlag, shellExample} from '../index.ts'

const _flag = stripTypesFlag()
alias('lit-md', ['node', _flag, './src/cli.ts'].filter(Boolean).join(' '))

describe('CLI', () => {
  // The lit-md CLI is used to do the transformations.
  shellExample('lit-md tmp.ts', {
    displayCommand: true,
    inputFiles: [{
      path: 'tmp.ts',
      content: `// # My Document\nimport { example } from 'node:test'\nexample('test', () => {})`
    }],
    outputFiles: [{
      path: 'tmp.md',
      contains: '# My Document'
    }]
  })

  describe('Custom output path', () => {
    // Use --out to write to a different location.
    shellExample('lit-md tmp.ts --out /tmp/docs.md', {
      displayCommand: true,
      inputFiles: [{
        path: 'tmp.ts',
        content: `// # Documentation\nimport { example } from 'node:test'`
      }],
      outputFiles: [{
        path: '/tmp/docs.md',
        contains: '# Documentation'
      }]
    })
  })

  describe('Help', () => {
    // Use `lit-md --help` for options.
    shellExample('lit-md --help', {
      displayCommand: true,
      stdout: {
        display: true
      }
    })
  })
})
