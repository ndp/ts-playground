import { strict as assert } from 'assert'

export function fill (n: number, ch: string) {
  return Array(Math.round(n)).fill(ch).join('')
}

function testFill () {
  assert.equal(fill(0, 'x'), '')
  assert.equal(fill(1, 'z'), 'z')
  assert.equal(fill(3, 'x'), 'xxx')
}

testFill()
