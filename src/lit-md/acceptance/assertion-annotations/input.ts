// # Assertion Annotations
//
// Assertions inside `example()` bodies are rewritten as inline annotations,
// turning passing tests into self-documenting code examples.

import { example } from '../../index.ts'
import assert from 'node:assert/strict'

// ## assert.equal → `// => value`

example('equal', () => {
  const len = 'hello'.length
  assert.equal(len, 5)
})

// ## assert.deepEqual — Single Line
//
// When the expected value fits on one line, it appears inline.

example('deepEqual single-line', () => {
  const nums = [1, 2, 3]
  assert.deepEqual(nums, [1, 2, 3])
})

// ## assert.deepEqual — Multi-Line
//
// When the expected value spans multiple lines, the annotation wraps
// across comment lines following the variable.

example('deepEqual multi-line', () => {
  const point = { x: 1, y: 2 }
  assert.deepEqual(point, {
    x: 1,
    y: 2
  })
})

// ## assert.notEqual → `// != value`

example('notEqual', () => {
  const value = getValue()
  assert.notEqual(value, null)
})

// ## assert.throws — With Pattern

example('throws with pattern', () => {
  assert.throws(() => divide(1, 0), /division by zero/)
})

// ## assert.throws — No Pattern

example('throws no pattern', () => {
  assert.throws(() => divide(1, 0))
})

// ## assert.ok — Dropped at Statement Level
//
// `assert.ok(expr)` as a standalone statement is silently removed from output.
// It still runs and guards correctness, but doesn't clutter the docs.

example('ok dropped', () => {
  const items = [1, 2, 3]
  assert.ok(items.length > 0)
})

// Helpers used above:
function getValue() { return 42 }
function divide(a: number, b: number) {
  if (b === 0) throw new Error('division by zero')
  return a / b
}
