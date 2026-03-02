// # describe() Transparency
//
// `describe()` wrappers are completely transparent in generated output.
// The describe name is discarded; only the examples and comments inside appear.

import { describe, example } from '../../index.ts'
import assert from 'node:assert/strict'

// ## Basic Transparency
//
// The word "Math" never appears in the output — only the example body does.

describe('Math', () => {
  example('add', () => {
    const sum = 1 + 1
    assert.equal(sum, 2)
  })
})

// ## Prose Inside describe()
//
// Comments between examples inside `describe()` become interleaved prose blocks.

describe('string utilities', () => {
  // Convert a string to upper case:

  example('toUpperCase', () => {
    const result = 'hello'.toUpperCase()
    assert.equal(result, 'HELLO')
  })

  // And back to lower:

  example('toLowerCase', () => {
    const result = 'WORLD'.toLowerCase()
    assert.equal(result, 'world')
  })
})

// ## Nested describe()
//
// Deeply nested `describe()` wrappers are also transparent.

describe('outer', () => {
  describe('inner', () => {
    example('deep', () => {
      const x = 6 * 7
      assert.equal(x, 42)
    })
  })
})
