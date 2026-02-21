import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {RiggedQueue} from './RiggedQueue.ts'

describe('RiggedQueue', () => {

  // --- peek() ordering ---

  test('peek() returns winners first, then nonWinners', () => {
    const q = new RiggedQueue(5, ['w1', 'w2'], ['a', 'b', 'c'])
    assert.deepEqual(q.peek(), ['w1', 'w2', 'a', 'b', 'c'])
  })

  test('peek() winners appear in Set insertion order', () => {
    const q = new RiggedQueue(10, ['z', 'a', 'm'])
    assert.deepEqual(q.peek(), ['z', 'a', 'm'])
  })

  test('peek() result is capped at maxSize (nonWinners truncated)', () => {
    const q = new RiggedQueue(3, ['w1'], ['a', 'b', 'c', 'd'])
    assert.deepEqual(q.peek(), ['w1', 'a', 'b'])
  })

  test('peek() cap: winners always included even when count exceeds maxSize', () => {
    const q = new RiggedQueue(2, ['w1', 'w2', 'w3'], ['a', 'b'])
    // all 3 winners included despite maxSize=2; no nonWinners fit
    assert.deepEqual(q.peek(), ['w1', 'w2', 'w3'])
  })

  test('peek() with no nonWinners returns only winners', () => {
    const q = new RiggedQueue(5, ['w1', 'w2'])
    assert.deepEqual(q.peek(), ['w1', 'w2'])
  })

  test('peek() with no winners returns only nonWinners up to cap', () => {
    const q = new RiggedQueue(2, [], ['a', 'b', 'c'])
    assert.deepEqual(q.peek(), ['a', 'b'])
  })

  test('peek() skips nonWinner items already in winners list', () => {
    // 'w1' appears in both winners and nonWinners; calculateItems guards with includes()
    const q = new RiggedQueue(5, ['w1'], ['w1', 'a', 'b'])
    assert.deepEqual(q.peek(), ['w1', 'a', 'b'])
  })

  test('peek() result is cached (same array reference on repeated calls)', () => {
    const q = new RiggedQueue(5, ['w1'], ['a'])
    assert.equal(q.peek(), q.peek())
  })

  // --- add() ---

  test('add() inserts new item at front of nonWinners', () => {
    const q = new RiggedQueue(5, [], ['b', 'c'])
    q.add('a')
    assert.deepEqual(q.peek(), ['a', 'b', 'c'])
  })

  test('add(a, b, c) places items in a, b, c order at front', () => {
    const q = new RiggedQueue(10, [], ['x'])
    q.add('a', 'b', 'c')
    assert.deepEqual(q.peek(), ['a', 'b', 'c', 'x'])
  })

  test('add() does not move an existing nonWinner to front', () => {
    const q = new RiggedQueue(5, [], ['a', 'b', 'c'])
    q.add('b') // 'b' already present
    assert.deepEqual(q.peek(), ['a', 'b', 'c'])
  })

  test('add() silently ignores winners', () => {
    const q = new RiggedQueue(5, ['w1'], ['a'])
    q.add('w1')
    assert.deepEqual(q.peek(), ['w1', 'a'])
  })

  test('add() invalidates the peek() cache', () => {
    const q = new RiggedQueue(5, [], ['a', 'b'])
    const before = q.peek()
    q.add('c')
    const after = q.peek()
    assert.notEqual(before, after)
    assert.deepEqual(after, ['c', 'a', 'b'])
  })

  // --- cap enforcement after add() ---

  test('newly added items respect maxSize cap in peek()', () => {
    const q = new RiggedQueue(3, ['w1'], ['a', 'b'])
    // already at cap: w1 + a + b = 3
    q.add('c')
    // 'c' is at front of nonWinners but 'b' is now beyond cap
    assert.deepEqual(q.peek(), ['w1', 'c', 'a'])
  })

  // --- use() ---

  test('use() does not throw and does not change peek() ordering', () => {
    const q = new RiggedQueue(5, ['w1'], ['a', 'b'])
    const before = q.peek().slice()
    q.use('a')
    assert.deepEqual(q.peek(), before)
  })

  test('use() does not affect peek() cache reference', () => {
    const q = new RiggedQueue(5, [], ['a', 'b'])
    const ref = q.peek()
    q.use('a')
    // use() doesn't null out items, so cache is still the same object
    assert.equal(q.peek(), ref)
  })

  // --- constructor nonWinners ---

  test('constructor nonWinners pre-populates queue', () => {
    const q = new RiggedQueue(10, [], ['x', 'y', 'z'])
    assert.deepEqual(q.peek(), ['x', 'y', 'z'])
  })

  test('constructor with no third arg defaults to empty nonWinners', () => {
    const q = new RiggedQueue(5, ['w1'])
    assert.deepEqual(q.peek(), ['w1'])
  })
})
