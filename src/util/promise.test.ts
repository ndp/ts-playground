import {strict as assert} from 'assert'
import type {Equal, Expect} from '@type-challenges/utils'
import {isPromise} from './promise.ts'
import {test} from 'node:test'

test('isPromise', function () {
  // Happy path
  const maybe = Math.random() < 2
  const fooPromise = maybe ? Promise.resolve('foo' as const) : 'bar'
  assert.equal(isPromise(fooPromise), true)

  // Show that the types are narrowed properly
  if (isPromise(fooPromise)) {
    type cases1 = [
      Expect<Equal<typeof fooPromise, Promise<'foo'>>>
    ]
  } else {
    type cases2 = [
      Expect<Equal<typeof fooPromise, 'bar'>>
    ]
  }

  const rejectedPromise = Promise.reject('foo');
  assert.equal(isPromise(rejectedPromise), true)
  // Catch that to prevent "unhandled rejection" warning
  rejectedPromise.catch(() => 0)

  // A promise is just an object with a .then function property
  assert.equal(isPromise({then: () => null}), true)

  // Then a whole bunch of non-promises...
  assert.equal(isPromise(null), false)
  assert.equal(isPromise(undefined), false)
  assert.equal(isPromise(0), false)
  assert.equal(isPromise(1), false)
  assert.equal(isPromise(''), false)
  assert.equal(isPromise('then'), false)
  assert.equal(isPromise(false), false)
  assert.equal(isPromise(true), false)
  assert.equal(isPromise({}), false)
  assert.equal(isPromise({'then': true}), false)
  assert.equal(isPromise({'then': 1}), false)
  assert.equal(isPromise([]), false)
  assert.equal(isPromise([true]), false)
  assert.equal(isPromise(['then']), false)
  assert.equal(isPromise(() => null), false)
})

// refs. https://github.com/then/is-promise
