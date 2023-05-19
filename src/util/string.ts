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


/**
 * The infamous "left pad".
 * @param s
 * @param len
 */
export const lpad = (s: string, len: number): string => s.length < len ? lpad(' ' + s, len) : s;


function testLeftPad() {
  assert.equal(lpad('a', 0), 'a')
  assert.equal(lpad('a', 1), 'a')
  assert.equal(lpad('a', 2), ' a')
  assert.equal(lpad('a', 10), '         a')
}

testLeftPad()


export const rpad = (s: string, len: number): string => s.length < len ? rpad(s.toString() + ' ', len) : s;


function testRightPad() {
  assert.equal(rpad('a', 0), 'a')
  assert.equal(rpad('a', 1), 'a')
  assert.equal(rpad('a', 2), 'a ')
  assert.equal(rpad('a', 10), 'a         ')
}

testRightPad()
