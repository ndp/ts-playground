import { strict as assert } from 'assert'

/**
 * TODO
 * - [ ] what is an empty param, eg /foo?q   Possible answers are `true`, `null`
 * - [ ] what is an /foo?q=false   Possible answers are `false`, `"false"`
 *
 * There are two types of URLs:
 * - patterns
 * - urls
 * At some point they need to be distinguished, and these functions won't work
 * for all of them.
 *
 * We'll need:
 * PatternURL
 * MatchableURL
 * matches(m:MatchableURL, p: PatternURL) => false | ParamObj
 */

type UrlStr = string
type URLParams = Record<string, string | true>

/**
 * Take the first part of a URL string, everything before the `?` of parameters.
 *
 * Base = domain + path = everything before the parameters
 */
type ExtractBaseFromUrlStr<T> = T extends `${infer Base}?${string}` ? Base : T
function extractBaseFromUrlStr<U extends UrlStr> (url: U): ExtractBaseFromUrlStr<U> {
  return url.split('?')[0] as ExtractBaseFromUrlStr<U>
}

/**
 * Build a canonical version of a URL string. Canonical means:
 * - each parameter only once
 * - parameters alphabetized
 * - parameters with value "true" are included with '=' sign.
 */
function buildUrlString<Params extends URLParams, Base extends string> (
  urlOrBase: Base,
  newParams: Params | undefined = undefined
): `${ExtractBaseFromUrlStr<Base>}${string}` | Base {

  const existingParams = buildParamObjFromUrlStr(urlOrBase)
  const parameters = { ...existingParams, ...(newParams || {}) }

  if (Object.entries(parameters).length === 0)
    return urlOrBase

  return `${extractBaseFromUrlStr(urlOrBase)}?${
    Object
      .keys(parameters)
      .sort()
      .map(k => `${k}${parameters[k] === true ? '' : `=${encodeURIComponent(parameters[k])}`}`)
      .join('&')}`
}

function asBaseAndParams<U extends UrlStr> (url: U): [ExtractBaseFromUrlStr<U>, BuildParamObjFromUrlStr<U>] {
  return [extractBaseFromUrlStr(url), buildParamObjFromUrlStr(url)]
}

type ExtractParamStrFromUrlStr<T extends string> = T extends `${string}?${infer Params}` ? Params : ''
function extractParamStrFromUrlStr<U extends UrlStr> (url: U): ExtractParamStrFromUrlStr<U> {
  const [, p]: string[] = url.split('?')
  return (p || "") as ExtractParamStrFromUrlStr<U>
}

/**
 * Build an object of the parameters extracted from the given
 * URL string.
 */
type BuildParamObjFromParamStr<T extends string> =
  T extends `${infer F}&${infer Rest}` ?
    (ParamObjOf<F> & BuildParamObjFromParamStr<Rest>) :
    (T extends '' ? any : ParamObjOf<T>)
function buildParamObjFromParamStr<U extends string> (paramStr: U): BuildParamObjFromParamStr<U> {
  const parts = paramStr.split('&')
  return parts.reduce((m, p) => {
    const [lval, rval] = p.split('=')
    if (lval.length > 0) {
      m[lval] = rval ?? true // detecting null or undefined
    }
    return m
  }, {} as Record<string, string | true>) as BuildParamObjFromParamStr<U>
}


/**
 * buildParamObjFromUrlStr
 * Build an object from the param portion of a URL, basically
 * key1=value1&key2=value2 etc.
 */
type BuildParamObjFromUrlStr<U extends UrlStr> =
  BuildParamObjFromPathStr<ExtractBaseFromUrlStr<U>> &
  BuildParamObjFromParamStr<ExtractParamStrFromUrlStr<U>>
function buildParamObjFromUrlStr<U extends UrlStr> (url: U): BuildParamObjFromUrlStr<U> {
  return buildParamObjFromParamStr(extractParamStrFromUrlStr(url))
}

export function sketchyUrl (url: UrlStr) {
  return url.includes('undefined') || url.includes('null')
}

function testAsUrlString () {
  assert.equal(buildUrlString('/foo'), '/foo')
  assert.equal(buildUrlString('/foo', { bar: 'baz' }), '/foo?bar=baz')

  // alphabetizes
  assert.equal(buildUrlString('/foo', { a: 'eh', B: 'Bee', z: 'Zhee' }), '/foo?B=Bee&a=eh&z=Zhee')
  assert.equal(buildUrlString('/foo', { z: 'Zhee', a: 'eh', B: 'Bee' }), '/foo?B=Bee&a=eh&z=Zhee')
  assert.equal(buildUrlString('/foo', { B: 'Bee', z: 'Zhee', a: 'eh' }), '/foo?B=Bee&a=eh&z=Zhee')

  // encodes
  assert.equal(buildUrlString('/foo', { q: '!' }), '/foo?q=!')
  assert.equal(buildUrlString('/foo', { q: 'k&r' }), '/foo?q=k%26r')
  assert.equal(buildUrlString('/foo', { q: 'chunky/monkey' }), '/foo?q=chunky%2Fmonkey')
  assert.equal(buildUrlString('/foo', { q: 're: homework' }), '/foo?q=re%3A%20homework')
  assert.equal(buildUrlString('/foo', { q: 'approved 👍🏽' }), '/foo?q=approved%20%F0%9F%91%8D%F0%9F%8F%BD')

// mix and match
  assert.equal(buildUrlString('/foo?B=Beet', { a: 'eh' }), '/foo?B=Beet&a=eh')
  // override
  assert.equal(buildUrlString('/foo?B=Beet', { a: 'eh', B: 'Bee' }), '/foo?B=Bee&a=eh')

  // sorts params from existing string
  assert.equal(buildUrlString('/foo?b=Beet&a=apple', {}), '/foo?a=apple&b=Beet')
  assert.equal(buildUrlString('/foo?b=Beet&a=apple'), '/foo?a=apple&b=Beet')

  assert.equal(buildUrlString('/foo', { a: true, b: false } as unknown as URLParams), '/foo?a&b=false')

  console.log('testAsUrlString: 👍🏽')
}

function testAsBaseAndParams () {
  assert.deepEqual(asBaseAndParams('/'), ['/', {}])
  assert.deepEqual(asBaseAndParams('/foo?bar&baz=2'),
                   ['/foo', { bar: true, baz: '2' }])

  console.log('testAsBaseAndParams: 👍🏽')
}

function testExtractBaseFromUrlStr () {
  assert.equal(extractBaseFromUrlStr('/foo'), '/foo')
  assert.equal(extractBaseFromUrlStr('/foo?bar'), '/foo')
  assert.equal(extractBaseFromUrlStr('/foo?bar=bz'), '/foo')
  console.log('testBaseFrom: 👍🏽')
}

function testParamsFrom () {
  assert.deepEqual(buildParamObjFromUrlStr('/foo'), {})
  assert.deepEqual(buildParamObjFromUrlStr('/foo?a=eh'), { a: 'eh' })
  assert.deepEqual(buildParamObjFromUrlStr('/foo?B=Bee'), { B: 'Bee' })
  assert.deepEqual(buildParamObjFromUrlStr('/foo?B=Bee&a=Apple'), { B: 'Bee', a: 'Apple' })
  assert.deepEqual(buildParamObjFromUrlStr('/foo?a'), { a: true })
  assert.deepEqual(buildParamObjFromUrlStr('/foo?a&b='), { a: true, b: '' })
  assert.deepEqual(buildParamObjFromUrlStr('/foo?a&b=&c'), { a: true, b: '', c: true })
  console.log('testParamsFrom: 👍🏽')
}


type Str2Type<S> =
  S extends `<${infer C}>`
    ? Str2Type<C>
    : S extends 'number'
      ? number
      : S extends 'string'
        ? string
        : S

type ParamObjFromPathPart<KV extends string> =
  KV extends `${infer K}:${infer T}`
    ? Record<K, Str2Type<T>>
    : Record<KV, string>

type BuildParamObjFromPathStr<P extends string> =
  P extends `${string}<${infer KV}>${infer Rest}`
    ? ParamObjFromPathPart<KV> & BuildParamObjFromPathStr<Rest>
    : Record<never, any>

type ParamObjOf<T extends string> =
  T extends `${infer K}?=${infer V}` ?
    Partial<Record<K, Str2Type<V>>> :
    T extends `${infer K}=${infer V}` ?
      Record<K, Str2Type<V>> :
      T extends `${infer K}?` ?
        Partial<Record<K, boolean>> :
        Record<T, boolean>



let z0: BuildParamObjFromPathStr<'/foo/<id:number>'>
z0 = { id: 5 }
z0 = { id: 6 }
// z0 = { id: 'A' }

let z1: BuildParamObjFromPathStr<'/article/<id:number>/<title:string>/<keywords>'>
z1 = { id: 4955, title: 'asdlfkjas', keywords: 'afdd' }
z1 = { id: 4955, title: 'asdlfkjas', keywords: '333' }

let z2: BuildParamObjFromUrlStr<'/article/<id:number>/<title:string>?keywords?=<string>'>
z2 = { id: 4955, title: 'asdlfkjas', keywords: 'afdd' }
z2 = { id: 4955, title: 'asdlfkjas' }
// z2 = { id: 4955, title: 5 }
// z2 = { id: 4955, title: 'asdlfkjas', keywords: 39393 }


const a1: BuildParamObjFromParamStr<'a=1&b=2'> = { a: '1', b: '2' }
// @ts-expect-error missing param
const a2: BuildParamObjFromParamStr<'a=1&b=2'> = { a: '1' }
const a4: BuildParamObjFromParamStr<'a=1&b=2'> = { a: '1', b: '2' }
// @ts-expect-error extra param
const a3: BuildParamObjFromParamStr<'a=1&b=2'> = { a: '1', error: '3' }
const b0: Array<BuildParamObjFromUrlStr<'/foo'>> = [] // never
const b1: BuildParamObjFromUrlStr<'/foo?a=1'> = { a: '1' }
const b4: BuildParamObjFromUrlStr<'/foo?a=1&b=2'> = { a: '1', b: '2' }
// @ts-expect-error extra param
const b2: BuildParamObjFromUrlStr<'/foo?a=1&b=2'> = { a: '1', b: '2', error: '3' }


const b3: BuildParamObjFromUrlStr<'/foo/<id:number>'> = { id: 3 }
const b35: BuildParamObjFromUrlStr<'/foo/<id:number>?a=1&b=2'> = { a: '1', b: '2', id: 3 }

const c0: ExtractParamStrFromUrlStr<''> = ''
const c1: ExtractParamStrFromUrlStr<'/foo?'> = ''
const c2: ExtractParamStrFromUrlStr<'/foo?a=3'> = 'a=3'

const d0: BuildParamObjFromParamStr<'a=<number>'> = { a: 77 }
// @ts-expect-error bad type
const d1: BuildParamObjFromParamStr<'a=<number>'> = { a: 'b' }

let d3: BuildParamObjFromParamStr<'a=<string>'>
d3 = { a: 'b' }
// @ts-expect-error extra
d3 = { a: 'b', b: 'x' }
// @ts-expect-error bad type
d3 = { a: 77 }
// @ts-expect-error missing
d3 = {}

let d5: BuildParamObjFromParamStr<'a?=<string>'>
d5 = { a: '77' }
d5 = {}

let d4: BuildParamObjFromParamStr<'a?'>
d4 = {}
d4 = { a: true }
d4 = { a: false }
// @ts-expect-error bad type
d4 = { a: 'grrr' }

let d2: BuildParamObjFromParamStr<'a'>
d2 = { a: true }
d2 = { a: false }

//-----------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------
type RouteHandler<U extends UrlStr> = (params: BuildParamObjFromUrlStr<U>) => string
type RouteHandlerCallback<U extends UrlStr> = (h: RouteHandler<U>) => void

type RouteChain<U extends UrlStr> = { handle: RouteHandlerCallback<U> }

function route<U extends UrlStr> (url: U): RouteChain<U> {
  //const params = buildParamObjFromUrlStr(url)
  let handler: RouteHandler<U>
  const callback: RouteHandlerCallback<U> = (f) => handler = f
  return {
    handle: callback
  }
}

function r<U extends UrlStr> (url: U, rh: RouteHandler<U>) {
// haha
  if (url == 's')
    console.log(rh)
}

r('/foo', () => 'there')
r('/foo?a=1', ({ a }) => `Hello, ${a}`)
r('/foo?a=2&b=1', ({ a, b }) => `Hello, ${a} ${b}`)

route('/foo').handle(() => '')
route('/foo?a=1').handle(({ a }) => `${a}`)
route('/foo?a=<number>&b=<string>').handle(({ a, b }) => `console.log(a, b) || ''`)
route('/foo?a=2&b=1&c=3').handle(({ a, b, c }) => `console.log(a, b) || ''`)


testParamsFrom()
testExtractBaseFromUrlStr()
testAsUrlString()
testAsBaseAndParams()

