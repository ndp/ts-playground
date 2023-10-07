import { strict as assert } from 'assert'
import {Happ, Interval} from './Happ'

// export function areUniform<T extends Duration[]> (durations: T):
//   durations is (T['length'] extends 0 ? Duration[] : T extends GeologicDuration[0] ? GeologicDuration[] : YearDuration[]) {
//   return new Set(durations.map(d => d.unit)).size === 1
// }
//
// function testAreUniform () {
//   assert.equal(areUniform([]), false)
//   assert.equal(areUniform([{ from: 1, to: 2, unit: 'Mya' }]), true)
//   assert.equal(areUniform(
//     [
//       { from: 1, to: 2, unit: 'Mya' },
//       { from: 1, to: 2, unit: 'A.D.' }
//     ]), false)
// }

// testAreUniform()

export function range<D extends Interval> (durations: D[]): D {
  // assert(areUniform(durations))
  const from = Math.max(...durations.map(h => h.moment));
  const too = Math.min(...durations.map(h => h.moment2));
  const scale: D['scale'] = durations[0].scale;
  return {
    moment: from,
    moment2: too,
    scale: scale
  } as D
}

export function sort<T extends Interval[]> (
  by: 'begin' | 'middle' | 'end',
  intervals: T): T {
  return intervals.sort((a, b) => {
    const start = b.moment - a.moment
    if (start) return start
    // they both start the same time, return the longer one first
    return a.moment2 - b.moment2
  })
}
