import {globSync} from 'glob'

import {describe, test} from 'node:test'
import assert from 'node:assert/strict'

const anInput: InputSpec = [
  {
    files: '**/*.jpg',
    strategy: 'cache-on-install'
  },
  {
    paths: 'a.html',
    strategy: 'cacheFirst'
  },
  {
    paths: 'b.html',
    strategy: 'staleWhileRevalidate'
  },
  {
    paths: 'c.html',
    strategy: 'networkFirst'
  },
  {
    paths: 'd.html',
    strategy: 'networkOnly' // no-cache
  }
];


// Preload and cache any number of files enumerated from disk
// Implies 'cacheFirst'.
type CacheFileOnInstall = {
  strategy: 'cache-on-install',
  files: FilesSpec
}

// Preload and cache enumerated paths
type CachePathOnInstall<Paths> = {
  strategy: 'cache-on-install',
  paths: Paths
}


// https://web.dev/learn/pwa/serving/#cache-first
// Ideal for: CSS, images, fonts, JS, templates… basically anything you'd consider static to that "version" of your site.
// needs expiration
// https://web.dev/offline-cookbook/#on-network-response
// if retrieved via network, gets cached
type CacheFirstStrategy<Paths> = {
  readonly strategy: 'cacheFirst'
  readonly paths: Paths
}
// https://web.dev/learn/pwa/serving/#network-first
type NetworkFirstStrategy<Paths> = {
  strategy: 'networkFirst'
  paths: Paths
}

// https://web.dev/learn/pwa/serving/#stale-while-revalidate
type StaleWhileRevalidateStrategy<Paths> = {
  strategy: 'staleWhileRevalidate'
  paths: Paths
}

// https://web.dev/learn/pwa/serving/#network-only
type NetworkOnlyStrategy<Paths> = {
  strategy: 'networkOnly'
  paths: Paths
}

// https://web.dev/learn/pwa/serving/#cache-only

function isRoutableStrategy<Paths>(x: { strategy: string }): x is RoutableStrategy<Paths> {
  return x.strategy === 'cacheFirst'
    || x.strategy === 'networkFirst'
    || x.strategy === 'staleWhileRevalidate'
    || x.strategy === 'networkOnly'
}

type RoutableStrategy<Paths> = CacheFirstStrategy<Paths>
  | NetworkFirstStrategy<Paths>
  | StaleWhileRevalidateStrategy<Paths>
  | NetworkOnlyStrategy<Paths>

type CacheOnInstallStrategy = CachePathOnInstall<InputPaths>
  | CacheFileOnInstall

type InputCacheStrategy = RoutableStrategy<InputPaths> | CacheOnInstallStrategy
type InputSpec = Array<InputCacheStrategy>

type InputCacheStrategyAsPaths = RoutableStrategy<InputPaths> | CachePathOnInstall<InputPaths>

// type OutputCacheStrategy = RoutableStrategy<OutputPaths> | CachePathOnInstall<OutputPaths>
// type OutputSpec = Array<OutputCacheStrategy>

type InputPaths =
  RegExp | string | OutputPaths

// Convert to always be an array
type OutputPaths = Array<string | RegExp>


function convertPreloadFilesToPaths(strategy: CacheFileOnInstall): CachePathOnInstall<InputPaths> {
  const paths = fileSpecsToPaths(strategy.files)
  return {
    strategy: 'cache-on-install',
    paths
  }
}

function convertPreloadFilesToPreloadPaths(strategy: InputCacheStrategy): InputCacheStrategyAsPaths {
  if (isPreloadFiles(strategy))
    return convertPreloadFilesToPaths(strategy)
  else
    return strategy
}

function extractAllPreloadPaths(spec: Array<InputCacheStrategyAsPaths>): OutputPaths {
  return spec
    .filter(isPreloadPaths)
    .map(s => s.paths)
    .flat()
    .sort()
}

function convertPreloadPathsToCacheFirst(spec: Array<InputCacheStrategyAsPaths>): Array<RoutableStrategy<InputPaths>> {
  return spec.map(s =>
    isRoutableStrategy<InputPaths>(s)
      ? s
      : {
        strategy: 'cacheFirst',
        paths: s.paths
      } satisfies CacheFirstStrategy<InputPaths>)
}

describe('convertPreloadPathsToCacheFirst', () => {

  test('ignores other strategies', () => {
    const input = [
      {strategy: "cache-on-install", paths: 'a.txt'},
      {strategy: "staleWhileRevalidate", paths: '/w'},
    ] satisfies InputSpec

    const actual = convertPreloadPathsToCacheFirst(input)

    assert.deepEqual(actual, [
      {strategy: 'cacheFirst', paths: 'a.txt'},
      {strategy: 'staleWhileRevalidate', paths: '/w'},
    ])

  })

  test('converts to cacheFirst', () => {
    const input = [
      {strategy: "cache-on-install", paths: 'a.txt'},
      {strategy: "cache-on-install", paths: 'b.txt'},
    ] satisfies InputSpec

    const actual = convertPreloadPathsToCacheFirst(input)

    assert.deepEqual(actual, [
      {strategy: 'cacheFirst', paths: 'a.txt'},
      {strategy: 'cacheFirst', paths: 'b.txt'},
    ])
  })
})

describe('unifyPreloadPaths', () => {
  test('returns a single strategy', () => {
    const input = [
      {strategy: "cache-on-install", paths: ['c']},
      {strategy: "cache-on-install", paths: ['a', 'b']}
    ] satisfies Array<InputCacheStrategyAsPaths>
    const actual = extractAllPreloadPaths(input)

    assert.deepEqual(actual, {strategy: "cache-on-install", paths: ['a', 'b', 'c']})
  })


  test('ignores other strategies', () => {
    const input = [
      {strategy: "cache-on-install", paths: 'a.txt'},
      {strategy: "cacheFirst", paths: '/a'},
      {strategy: "cache-on-install", paths: 'b.txt'},
    ] satisfies Array<InputCacheStrategyAsPaths>

    const actual = extractAllPreloadPaths(input)

    assert.deepEqual(actual,
      {paths: ['a.txt', 'b.txt'], strategy: 'cache-on-install'})

  })
})

function convertAllPreloadFilesToPreloadPaths(spec: Array<InputCacheStrategy>): Array<InputCacheStrategyAsPaths> {
  return spec.map(convertPreloadFilesToPreloadPaths);
}

export function generateServiceWorker(inputSpec: InputSpec): string {
  const spec = convertAllPreloadFilesToPreloadPaths(inputSpec)

  const preloadPaths = extractAllPreloadPaths(spec)

  const routable = convertPreloadPathsToCacheFirst(spec)

  return generatePreloadCode(preloadPaths) + generateRoutes(routable)
}

function isPreloadFiles(s: { strategy: string }): s is CacheFileOnInstall {
  return s.strategy === 'cache-on-install' && 'files' in s
}

function isPreloadPaths(s: { strategy: string }): s is CachePathOnInstall<unknown> {
  return s.strategy === 'cache-on-install' && 'paths' in s
}

console.log(generateServiceWorker([
  {strategy: "cache-on-install", paths: '/foo.jpeg'},
  {strategy: "cache-on-install", files: {glob: '*.md'}},
  {strategy: "cache-on-install", files: {dir: '/Users/ndp/workspace/ts-playground/src/happs', glob: '**/*.ts'}},
  {strategy: "staleWhileRevalidate", paths: /.*\.json/}
]))

function pathsToJS(paths: InputPaths) {
const asArray = Array.isArray(paths)
? paths : [paths]
  return `[${asArray.map(pathToJS).join(',')}]`
}

function pathToJS(path: string | RegExp) {
  return typeof path === 'string'
  ? `"${path}"`
    : `${path}`
}

function generatePreloadCode(paths: OutputPaths) {
  return `const PRELOAD_PATHS  = ${pathsToJS(paths)}`
}

function generateRoutes(spec: Array<RoutableStrategy<InputPaths>>) {
  return spec
    .map((s) => `[${s.strategy}, ${pathsToJS(s.paths)}]\n`)
    .join('/')
}

