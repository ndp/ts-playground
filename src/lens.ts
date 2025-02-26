import assert from 'node:assert/strict'
import {it as spec, describe, mock} from 'node:test'


/**
 The "lens" design pattern is used to abstract away the process of
 accessing and modifying nested data structures in a functional
 and immutable way. It provides a way to focus on a specific
 part of a data structure, allowing you to view and update
 that part without directly manipulating the entire structure.

 @see https://github.com/hatashiro/lens.ts/blob/master/test/test_proxy.ts
 @see https://github.com/atomicobject/lenses
 */
export type Lens<T> = {
  get value(): T;
  set(newValue: T): void
}

function inMemoryLens<T>(val: T): Lens<T> {
  return {
    set(newValue: T): void {
      val = newValue
    },
    get value(): T {
      return val;
    }
  }
}

type Observer<T> = (next: T, prev: T | undefined) => void
type ObserverOptions = { observeInitialValue: boolean }
export type ObservableLens<T> = Lens<T> & {
  // Add a change handler for the lens.
  // Returns a function to remove the observer
  onChange: (observer: Observer<T>, opts?: ObserverOptions) => () => void
}

export function observeableLens<T extends string>(lens: Lens<T>): ObservableLens<T> {
  const observers: Array<Observer<T>> = []
  const onChange = (next: T, prev: T | undefined) =>
    observers.forEach(observer => observer(next, prev))
  return {
    get value () { return lens.value },
    set: (newValue: T) => {
      const oldValue = lens.value
      lens.set(newValue)
      onChange(newValue, oldValue)
    },
    onChange: (handler: Observer<T>, {observeInitialValue}: ObserverOptions = {observeInitialValue: false}) => {
      observers.push(handler)
      if (observeInitialValue) setTimeout(() => handler(lens.value, undefined), 0)
      return () => removeItem(observers, handler)
    }
  }
}

function castingLens<A, B>(
  subject: Lens<A>,
  casts: {
    in: (b: B) => A,
    out: (a: A) => B
  }): Lens<B> {
  return {
    get value() {
      return casts.out(subject.value)
    },
    set(val) {
      subject.set(casts.in(val))
    }
  }
}

type OverridingLensOptions<T> = {
  base: Lens<T>,
  override: Lens<T|undefined>
  update: 'base' | 'override' | 'both'
}
function overridingLens<T>({base, override, update }: OverridingLensOptions<T>) {
  return {
    get value() {
      return override.value === undefined ?
        base.value : override.value
    },
    set(value: T) {
      if (update === 'override' || update === 'both')
        override.set(value)
      if (update === 'base' || update === 'both')
        base.set(value)
    }
  }
}


describe('overridingLens', () => {
  spec('uses a base value', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens('bar')
    const lens = overridingLens({base: b, override: o, update: 'both'})

    assert.equal(lens.value, 'bar')
  })
  spec('uses an override value', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined)
    const lens = overridingLens({base: b, override: o, update: 'both'})

    assert.equal(lens.value, 'foo')
  })
  spec('updates just the base', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined)
    const lens = overridingLens({base: b, override: o, update: 'base'})

    lens.set('bar')

    assert.equal(b.value, 'bar')
    assert.equal(o.value, undefined)

    assert.equal(lens.value, 'bar')
  })
  spec('updates just the override', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined)
    const lens = overridingLens({base: b, override: o, update: 'override'})

    lens.set('bar')

    assert.equal(lens.value, 'bar')
    assert.equal(b.value, 'foo')
    assert.equal(o.value, 'bar')
  })
  spec('updates both lenses', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined)
    const lens = overridingLens({base: b, override: o, update: 'both'})

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

    myLens.onChange(onChangeSpy, {observeInitialValue: true})

    await new Promise(r => setTimeout(r, 5))

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myLens.value, 'foo')
  })

  spec('can observe initial value', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()

    myLens.onChange(onChangeSpy)
    myLens.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myLens.value, 'bar')
  })
  spec('can remove an observer', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()

    const remover = myLens.onChange(onChangeSpy)
    remover()

    myLens.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 0)
  })
  spec('can observe multiple changes', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()
    myLens.onChange(onChangeSpy)

    myLens.set('bar')
    myLens.set('baz')
    myLens.set('buzz')

    assert.equal(onChangeSpy.mock.calls.length, 3)
  })
  spec('multiple observers', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy1 = mock.fn()
    const onChangeSpy2 = mock.fn()

    myLens.onChange(onChangeSpy1)
    myLens.onChange(onChangeSpy2)

    myLens.set('bar')

    assert.equal(onChangeSpy1.mock.calls.length, 1)
    assert.equal(onChangeSpy2.mock.calls.length, 1)
  })
})

describe('convertingLens', () => {
  spec('can convert from String to Int', () => {
    const lens1 = inMemoryLens('a')
    const lens2 = castingLens(lens1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    assert.equal(lens2.value, 10)
    assert.equal(lens1.value, 'a')
  })
  spec('can change outer lens', () => {
    const lens1 = inMemoryLens('a')
    const lens2 = castingLens(lens1, {
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
    const lens2 = castingLens(lens1, {
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


// Array util
export function removeItem<T>(arr: Array<T>, value: T): Array<T> {
  const index = arr.indexOf(value)
  if (index > -1) {
    arr.splice(index, 1)
  }
  return arr
}
