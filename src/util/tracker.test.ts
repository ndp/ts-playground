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
    const t = new Tracker<string>()
    const log: string[] = []
    t.onAdd((n) => () => log.push(`cleanup:${n}`))
    t.add(['a', 'b'])
    t.add('c')
    assert.equal(t.remove('d'), false)
    assert.equal(t.remove('b'), true)
    assert.equal(t.size, 2)
    assert.deepEqual(log, ['cleanup:b'])
  })

  test('removeAll clears items and returns past values', () => {
    const t = new Tracker<string>(['x', 'y'])
    const log: string[] = []
    t.onAdd((n) => () => log.push(`cleanup:${n}`))
    t.add('z')
    const removed = t.removeAll()
    assert.deepEqual(new Set(removed), new Set(['x', 'y', 'z']))
    assert.equal(t.size, 0)
    assert.deepEqual(new Set(log), new Set(['cleanup:z']))
  })

  test('listeners called on add and cleanup on remove; unsubscribe stops future adds', () => {
    const t = new Tracker<number>()
    const adds: number[] = []
    const cleanups: string[] = []
    const unsubA = t.onAdd((n) => {
      adds.push(n)
      return () => cleanups.push(`cleanup:${n}`)
    })

    t.add(1)
    t.add(2)
    assert.deepEqual(adds, [1, 2])

    unsubA()
    t.add(3)
    assert.deepEqual(adds, [1, 2], 'unsubscribed add should not be called')

    t.remove(2)
    assert.deepEqual(cleanups, ['cleanup:2'])
  })

  test('setAll runs cleanups before adds', () => {
    const t = new Tracker<number>()
    const seq: string[] = []
    t.onAdd((n) => {
      seq.push(`a:${n}`)
      return () => seq.push(`r:${n}`)
    })

    t.add([1, 2, 3])
    const {removed, added} = t.setAll([2, 4])
    assert.deepEqual(new Set(removed), new Set([1, 3]))
    assert.deepEqual(new Set(added), new Set([4]))
    // cleanups for removed items should appear before .adds for new items
    const firstCleanupIndex = seq.indexOf('r:1')
    const addIndex = seq.indexOf('a:4')
    assert.ok(firstCleanupIndex > -1 && addIndex > -1 && firstCleanupIndex < addIndex)
  })

  test('removeAll plus unsubscribe prevents future listener calls but keeps existing cleanups', () => {
    const t = new Tracker<string>()
    let seen = 0
    let cleaned = 0
    const unsub = t.onAdd(() => {
      seen++
      return () => { cleaned++; }
    })
    t.add('x')
    unsub()
    const removed = t.removeAll()
    assert.deepEqual(new Set(removed), new Set(['x']))
    assert.equal(t.size, 0)
    assert.equal(cleaned, 1)
    t.add('y')
    assert.equal(seen, 1)
  })
})
