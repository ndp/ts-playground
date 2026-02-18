import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import Tracker from './tracker.ts'

describe('Tracker', () => {
  test('add single item returns true once and ignores duplicates', () => {
    const t = new Tracker<number>()
    assert.equal(t.size, 0)
    assert.equal(t.add(1), true)
    assert.equal(t.add(1), false, 'should not track duplicates')
    assert.equal(t.size, 1)
  })

  test('add iterable returns only the newly tracked items', () => {
    const t = new Tracker<number>([1])
    const added = t.add([1, 2, 3]) as number[]
    assert.deepEqual(added, [2, 3])
    assert.equal(t.size, 3)
  })

  test('remove returns false when item missing and true when removed', () => {
    const t = new Tracker<string>(['a', 'b'])
    assert.equal(t.remove('c'), false)
    assert.equal(t.remove('b'), true)
    assert.equal(t.size, 1)
  })

  test('removeAll clears items and returns past values', () => {
    const t = new Tracker<string>(['x', 'y'])
    const removed = t.removeAll()
    assert.deepEqual(new Set(removed), new Set(['x', 'y']))
    assert.equal(t.size, 0)
  })

  test('listeners called on add/remove and unsubscribe', () => {
    const t = new Tracker<number>()
    let adds: number[] = []
    let removes: number[] = []
    const unsubA = t.onAdd((n) => adds.push(n))
    const unsubR = t.onRemove((n) => removes.push(n))

    t.add(1)
    t.add(2)
    assert.deepEqual(adds, [1, 2])

    unsubA()
    t.add(3)
    assert.deepEqual(adds, [1, 2], 'unsubscribed add should not be called')

    t.remove(2)
    assert.deepEqual(removes, [2])
    unsubR()
    t.remove(1)
    assert.deepEqual(removes, [2], 'unsubscribed remove should not be called')
  })

  test('setAll replaces and notifies removals then additions', () => {
    const t = new Tracker<number>([1, 2, 3])
    const seq: string[] = []
    t.onRemove((n) => seq.push(`r:${n}`))
    t.onAdd((n) => seq.push(`a:${n}`))

    const {removed, added} = t.setAll([2, 4])
    assert.deepEqual(new Set(removed), new Set([1, 3]))
    assert.deepEqual(new Set(added), new Set([4]))
    // removals should occur before additions
    assert.equal(seq[0].startsWith('r:'), true)
    assert.equal(seq.includes('a:4'), true)
  })

  test('removeAll plus unsubscribe prevents future listener calls', () => {
    const t = new Tracker<string>(['x'])
    let seen = 0
    const unsub = t.onAdd(() => seen++)
    unsub()
    const removed = t.removeAll()
    assert.deepEqual(new Set(removed), new Set(['x']))
    assert.equal(t.size, 0)
    t.add('y')
    assert.equal(seen, 0)
  })
})
