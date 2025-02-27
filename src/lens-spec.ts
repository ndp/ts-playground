import assert from 'node:assert/strict'
import {it as spec, describe, mock} from 'node:test'

import {inMemoryLens, observeableLens, transformLens, cascadingLens, ReadOnlyLens} from './lens'
import type { Lens } from './lens'


describe('cascadingLens', () => {
  spec('uses a base value', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens('bar')
    const lens = cascadingLens(o, b)

    assert.equal(lens.value, 'bar')
  })
  spec('uses an override value', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined)
    const lens = cascadingLens(o, b)

    assert.equal(lens.value, 'foo')
  })
  spec('updates just the base', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined as unknown as string)
    const lens = cascadingLens(o.readOnly, b)

    lens.set('bar')

    assert.equal(b.value, 'bar')
    assert.equal(o.value, undefined)

    assert.equal(lens.value, 'bar')
  })
  spec('updates just the override', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined as unknown as string)
    const lens = cascadingLens(o, b.readOnly)

    lens.set('bar')

    assert.equal(lens.value, 'bar')
    assert.equal(b.value, 'foo')
    assert.equal(o.value, 'bar')
  })
  spec('updates both lenses', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined as unknown as string)
    const lens = cascadingLens(o,b)

    lens.set('bar')

    assert.equal(lens.value, 'bar')
    assert.equal(b.value, 'bar')
    assert.equal(o.value, 'bar')
  })
})


describe('inMemoryLens', () => {
  spec('can store numbers', () => {
    assert.equal(inMemoryLens(1).value, 1)
    assert.equal(inMemoryLens(2).value, 2)
  })
  spec('can store objects', () => {
    assert.deepEqual(inMemoryLens({one: 1, two: [1, 2, 3], 3: 'tree'}).value, {one: 1, two: [1, 2, 3], 3: 'tree'})
  })
  spec('can change values', () => {
    const a = inMemoryLens('foo')
    assert.equal(a.value, 'foo')
    a.set('bar')
    assert.equal(a.value, 'bar')
    a.set('baz')
    assert.equal(a.value, 'baz')
  })
})

describe('observeableLens', () => {
  spec('can observe a change', async () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()

    myLens.addObserver(onChangeSpy, {observeInitialValue: true})

    await new Promise(r => setTimeout(r, 5))

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myLens.value, 'foo')
  })

  spec('can observe initial value', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()

    myLens.addObserver(onChangeSpy)
    myLens.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myLens.value, 'bar')
  })
  spec('can remove an observer', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()

    const remover = myLens.addObserver(onChangeSpy)
    remover()

    myLens.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 0)
  })
  spec('can observe multiple changes', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()
    myLens.addObserver(onChangeSpy)

    myLens.set('bar')
    myLens.set('baz')
    myLens.set('buzz')

    assert.equal(onChangeSpy.mock.calls.length, 3)
  })
  spec('multiple observers', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy1 = mock.fn()
    const onChangeSpy2 = mock.fn()

    myLens.addObserver(onChangeSpy1)
    myLens.addObserver(onChangeSpy2)

    myLens.set('bar')

    assert.equal(onChangeSpy1.mock.calls.length, 1)
    assert.equal(onChangeSpy2.mock.calls.length, 1)
  })
})

describe('convertingLens', () => {
  spec('can convert from String to Int', () => {
    const lens1 = inMemoryLens('a')
    const lens2 = transformLens(lens1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    assert.equal(lens2.value, 10)
    assert.equal(lens1.value, 'a')
  })
  spec('can change outer lens', () => {
    const lens1 = inMemoryLens('a')
    const lens2 = transformLens(lens1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    lens2.set(15)
    assert.equal(lens2.value, 15)
    assert.equal(lens1.value, 'f')

    lens2.set(1965)
    assert.equal(lens2.value, 1965)
    assert.equal(lens1.value, '7ad')
  })
  spec('can change inner lens', () => {
    const lens1 = inMemoryLens('a')
    const lens2 = transformLens(lens1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    lens1.set('f')
    assert.equal(lens2.value, 15)
    assert.equal(lens1.value, 'f')

    lens1.set('7ad')
    assert.equal(lens2.value, 1965)
    assert.equal(lens1.value, '7ad')
  })
})

describe('readOnlyLens', () => {
  spec('prevents modification to underlying lens', () => {
    const lens1 = inMemoryLens(7)
    const wrap = new ReadOnlyLens(lens1)

    assert.equal(wrap.value, 7)

    wrap.set(3)

    assert.equal(wrap.value, 7)
  })
})

describe('readOnly', () => {
  spec('prevents modification to underlying lens', () => {
    const lens1 = inMemoryLens(7)
    const wrap = lens1.readOnly

    assert.equal(wrap.value, 7)

    wrap.set(3)

    assert.equal(wrap.value, 7)
  })
})
