import {strict as assert} from 'node:assert'
import {fill, lpad, rpad} from './string.ts'
import {test} from 'node:test'

test('fill', function () {
  assert.equal(fill(0, 'x'), '')
  assert.equal(fill(1, 'z'), 'z')
  assert.equal(fill(3, 'x'), 'xxx')
})


test('left pad', function () {
  assert.equal(lpad('a', 0), 'a')
  assert.equal(lpad('a', 1), 'a')
  assert.equal(lpad('a', 2), ' a')
  assert.equal(lpad('a', 10), '         a')
})
test('right pad', function () {
  assert.equal(rpad('a', 0), 'a')
  assert.equal(rpad('a', 1), 'a')
  assert.equal(rpad('a', 2), 'a ')
  assert.equal(rpad('a', 10), 'a         ')
})

