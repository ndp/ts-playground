// # Encoder
//
// A TypeScript utility for base64 encoding strings.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { encode, decode } from './encoder.ts' // keep

/*
 * ## Basic Usage
 *
 * Pass any string to `encode` and get a base64 result:
 *
 * ```ts
 * import { encode } from './encoder.ts'
 * ```
 */

// file: encode-example.ts
describe('encode', () => {
  test('returns base64', () => {
    const result = encode('hello')
    assert.equal(result, 'aGVsbG8=')
  })

  // You can also encode empty strings:

  test('handles empty string', () => {
    assert.equal(encode(''), '')
  })
})

// ## Round-trip
//
// `decode` reverses `encode`:

describe('decode', () => {
  test('round-trips a string', () => {
    assert.equal(decode(encode('world')), 'world')
  })
})

// ## Illustrative
//
// Chaining is possible but unusual:
//
// ```ts
// const twice = encode(encode('hello'))
// ```
