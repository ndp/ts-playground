import { strict as assert } from 'assert'
import { Duration, Happ } from './Happ'

export function areUniform (happs: Happ[]): boolean {
  return new Set(happs.map(h => h.duration.unit)).size === 1
}

function testAreUniform () {
  assert.equal(areUniform([]), false)
  assert.equal(areUniform([new Happ({ from: 1, to: 2, unit: 'Mya' }, { name: 'foo' })]), true)
  // assert.equal(areUniform(
  //   [
  //     new Happ({ from: 1, to: 2, unit: 'Mya' }, { name: 'foo' }),
  //     new Happ({ from: 1, to: 2, unit: 'year' }, { name: 'bar' })
  //   ]), true)
}

testAreUniform()

export function range (happs: Happ[]): Duration {
  assert(areUniform(happs))
  return {
    from: Math.max(...happs
      .map(h => h.duration.from)),
    to:   Math.min(...happs.map(h => h.duration.to)),
    unit: happs[0].duration.unit
  }
}

export function sort (by: 'begin' | 'middle' | 'end', happs: Happ[]): Happ[] {
  return happs.sort((a, b) => {
    const start = b.duration.from - a.duration.from
    if (start) return start
    // they both start the same time, return the longer one first
    return a.duration.to - b.duration.to
  })
}
