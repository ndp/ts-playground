// # JavaScript Support
//
// lit-md works with JavaScript files too.
// Code blocks render with `js` syntax highlighting instead of `ts`.

import { example } from '../../src/index.ts'
import assert from 'node:assert/strict'

// ## Basic Example

example('greet', () => {
  const msg = 'hello'
  assert.equal(msg.length, 5)
})

// ## Functions Work Too

example('add', () => {
  const sum = 1 + 2
  assert.equal(sum, 3)
})
