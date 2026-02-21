import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {isIterableNonString} from './typescript.ts'

describe('isIterableNonString', () => {
  test('returns true for arrays', () => {
    assert.equal(isIterableNonString([1, 2, 3]), true)
    assert.equal(isIterableNonString([]), true)
  })

  test('returns true for Set', () => {
    assert.equal(isIterableNonString(new Set([1, 2])), true)
  })

  test('returns true for Map', () => {
    assert.equal(isIterableNonString(new Map([['a', 1]])), true)
  })

  test('returns true for custom iterable', () => {
    const iterable = {
      [Symbol.iterator]() {
        let n = 0
        return {next: () => n++ < 2 ? {value: n, done: false} : {value: undefined, done: true}}
      }
    }
    assert.equal(isIterableNonString(iterable), true)
  })

  test('returns false for strings', () => {
    assert.equal(isIterableNonString('hello'), false)
    assert.equal(isIterableNonString(''), false)
  })

  test('returns false for null', () => {
    assert.equal(isIterableNonString(null), false)
  })

  test('returns false for undefined', () => {
    assert.equal(isIterableNonString(undefined), false)
  })

  test('returns false for numbers', () => {
    assert.equal(isIterableNonString(42), false)
  })

  test('returns false for plain objects without Symbol.iterator', () => {
    assert.equal(isIterableNonString({a: 1}), false)
  })
})
