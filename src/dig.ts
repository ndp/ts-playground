import { strict as assert } from 'assert'


// https://www.strictmode.io/articles/build-test-and-publish-npm-package-2022

type ShapeRequired<P extends string, Leaf> =
  P extends `${infer K}.${infer R}`
    ? Record<K, ShapeRequired<R, Leaf>> :
    Record<P, Leaf>

type TypeOfLeaf<S extends string, T extends Record<string, any>> =
  S extends `${infer K}.${infer R}`
    ? TypeOfLeaf<R, T[K]>
    : T[S]

function digNonRecursive<P extends string, OT extends object> (
  path: P,
  o: ShapeRequired<P, TypeOfLeaf<P, OT>>): TypeOfLeaf<P, OT> {

  return path.split('.')
             .reduce(
               (m, seg) => m[seg], o as any)

}

function get<K extends string, V>(o: Record<K, V>|Map<K, V>, k: K): V { return  o instanceof Map ? o.get(k) as V : o[k] }

function dig1<P extends string, T extends object> (
  path: P,
  o: ShapeRequired<P, any>): any {
  const dotIndex = path.indexOf('.')
  return dotIndex < 0
    ? o[path]
    : dig1(path.substring(dotIndex + 1), o[path.substring(0, dotIndex)])
}

// assert.equal(null, dig('a', {}))
assert.equal(1, dig1('a', { a: 1 }))
assert.equal('b', dig1('a', { a: 'b' }))
assert.equal('b', dig1('and', { and: 'b' }))
assert.equal('yes', dig1('a.b.c', { a: { b: { c: 'yes' } } }))


type FirstSegmentOf<S> = S extends `${infer F}.${string}` ? F : S
type RestSegmentsOf<S> = S extends `${string}.${infer R}` ? R : null

function firstSegment<S extends string> (path: S) {
  const dotIndex = path.indexOf('.')
  return (dotIndex < 0)
    ? path
    : path.substring(0, dotIndex) as FirstSegmentOf<S>
}

function restSegments<S extends string> (path: S) {
  const dotIndex = path.indexOf('.')
  return (dotIndex < 0)
    ? null
    : path.substring(dotIndex + 1) as RestSegmentsOf<S>
}

function dig2<P extends string, OT extends object> (
  path: P,
  o: ShapeRequired<P, TypeOfLeaf<P, OT>>): TypeOfLeaf<P, OT> {

  const restPath = restSegments(path)
  if (restPath === null) return o[path]

  const first = firstSegment(path)
  const restObj = o[first] as ShapeRequired<typeof restPath, TypeOfLeaf<typeof restPath, OT>>
  return dig2(restPath, restObj) as TypeOfLeaf<P, OT>
}


function test<F extends (p: string, T: any) => any> (dig: F) {
  assert.equal(1, dig('a', { a: 1 }))
  assert.equal('b', dig('a', { a: 'b' }))
  assert.equal('b', dig('and', { and: 'b' }))
  assert.equal('yes', dig('a.b.c', { a: { b: { c: 'yes' } } }))



}

test(dig1)
test(dig2)
test(digNonRecursive)


const response = {
  json: {
    error: null,
    data:  {
      id:    '234kjadsf3',
      value: 'San Francisco'
    }
  }
}

assert.equal('San Francisco', digNonRecursive('json.data.value', response))
assert.equal('San Francisco', dig1('json.data.value', response))
assert.equal('San Francisco', dig2('json.data.value', response))

try {
// @ts-expect-error missing param
digNonRecursive('json.error.data.value', response)
} catch {}
try {
// @ts-expect-error missing param
dig1('json.error.data.value', response)
} catch {}
try {
// @ts-expect-error missing param
dig2('json.error.data.value', response)
} catch {}
