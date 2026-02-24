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

  // --- onChange() listeners ---

  test('onChange() listener fires after add() with correct added/removed/items', () => {
    const q = new RiggedQueue(5, [], ['a', 'b'])
    const events: { added: string[], removed: string[], items: string[] }[] = []
    q.onChange(e => events.push({ added: [...e.added], removed: [...e.removed], items: [...e.items] }))
    q.add('c')
    assert.equal(events.length, 1)
    assert.deepEqual(events[0].added, ['c'])
    assert.deepEqual(events[0].removed, [])
    assert.deepEqual(events[0].items, ['c', 'a', 'b'])
  })

  test('onChange() fires once per add() call, even when multiple items passed', () => {
    const q = new RiggedQueue(10, [], [])
    let callCount = 0
    q.onChange(() => { callCount++ })
    q.add('x', 'y', 'z')
    assert.equal(callCount, 1)
  })

  test('onChange() reports removed items when cap is exceeded', () => {
    const q = new RiggedQueue(3, ['w1'], ['a', 'b'])
    // peek is currently: w1, a, b (at cap)
    const events: { added: string[], removed: string[] }[] = []
    q.onChange(e => events.push({ added: [...e.added], removed: [...e.removed] }))
    q.add('c')
    assert.equal(events.length, 1)
    assert.deepEqual(events[0].added, ['c'])
    assert.deepEqual(events[0].removed, ['b'])
  })

  test('onChange() does NOT fire when add() changes nothing in peek()', () => {
    const q = new RiggedQueue(5, [], ['a', 'b', 'c'])
    let callCount = 0
    q.onChange(() => { callCount++ })
    q.add('a') // 'a' already in nonWinners, peek() unchanged
    assert.equal(callCount, 0)
  })

  test('onChange() does NOT fire when adding a winner (no change to peek)', () => {
    const q = new RiggedQueue(5, ['w1'], ['a'])
    let callCount = 0
    q.onChange(() => { callCount++ })
    q.add('w1')
    assert.equal(callCount, 0)
  })

  test('onChange() unsubscribe stops future notifications', () => {
    const q = new RiggedQueue(5, [], [])
    let callCount = 0
    const unsub = q.onChange(() => { callCount++ })
    q.add('a')
    assert.equal(callCount, 1)
    unsub()
    q.add('b')
    assert.equal(callCount, 1)
  })

  test('onChange() multiple listeners all receive the same event', () => {
    const q = new RiggedQueue(5, [], [])
    const results: string[][] = []
    q.onChange(e => results.push(['L1', ...e.added]))
    q.onChange(e => results.push(['L2', ...e.added]))
    q.add('x')
    assert.equal(results.length, 2)
    assert.deepEqual(results[0], ['L1', 'x'])
    assert.deepEqual(results[1], ['L2', 'x'])
  })

  test('onChange() listener error does not prevent other listeners from firing', () => {
    const q = new RiggedQueue(5, [], [])
    let secondCalled = false
    q.onChange(() => { throw new Error('boom') })
    q.onChange(() => { secondCalled = true })
    q.add('x')
    assert.equal(secondCalled, true)
  })
})
