// Copyright (c) 2023 Andrew J. Peterson, dba NDP Software
import {fileSpecsToPaths, FilesSpec} from "./fileSpecsToPaths.mjs";


// Preload and cache any number of files enumerated from disk using globs.
// Implies 'cacheFirst'.
export type CacheFileOnInstall = {
  strategy: 'cache-on-install',
  files: FilesSpec
}

export function isCacheFileOnInstall(s: { strategy: string }): s is CacheFileOnInstall {
  return s.strategy === 'cache-on-install' && 'files' in s
}


// Preload and cache enumerated paths (not files)
// Implies 'cacheFirst'.
export type CachePathOnInstall = {
  strategy: 'cache-on-install',
  paths: string | Array<string>
}

export function isCachePathOnInstall(s: { strategy: string }): s is CachePathOnInstall {
  return s.strategy === 'cache-on-install' && 'paths' in s
}


// https://web.dev/learn/pwa/serving/#cache-first
// Ideal for: CSS, images, fonts, JS, templates… basically anything you'd consider static to that "version" of your site.
// needs expiration
// https://web.dev/offline-cookbook/#on-network-response
// if retrieved via network, gets cached
export type CacheFirstStrategy<Paths> = {
  readonly strategy: 'cacheFirst'
  readonly paths: Paths
}

// https://web.dev/learn/pwa/serving/#network-first
export type NetworkFirstStrategy<Paths> = {
  strategy: 'networkFirst'
  paths: Paths
}

// https://web.dev/learn/pwa/serving/#stale-while-revalidate
export type StaleWhileRevalidateStrategy<Paths> = {
  strategy: 'staleWhileRevalidate'
  paths: Paths
}

// https://web.dev/learn/pwa/serving/#network-only
export type NetworkOnlyStrategy<Paths> = {
  strategy: 'networkOnly'
  paths: Paths
}

// TODO
// https://web.dev/learn/pwa/serving/#cache-only

export type RoutableStrategy<Paths> = CacheFirstStrategy<Paths>
  | NetworkFirstStrategy<Paths>
  | StaleWhileRevalidateStrategy<Paths>
  | NetworkOnlyStrategy<Paths>

export type CacheOnInstallStrategy = CachePathOnInstall
  | CacheFileOnInstall

export type InputCacheStrategy = RoutableStrategy<InputPaths> | CacheOnInstallStrategy
export type InputCacheStrategyAsPaths = RoutableStrategy<InputPaths> | CachePathOnInstall

export const Origin = Symbol.for('origin')
export const Scope = Symbol.for('scope')

export type InputPaths =
  RegExp | string | OutputPaths | typeof Origin | typeof Scope

// Convert to always be an array
export type OutputPaths = Array<string | RegExp>

export function isRoutableStrategy<Paths>(x: { strategy: string }): x is RoutableStrategy<Paths> {
  return x.strategy === 'cacheFirst'
    || x.strategy === 'networkFirst'
    || x.strategy === 'staleWhileRevalidate'
    || x.strategy === 'networkOnly'
}

export function convertPreloadFilesToPaths(strategy: CacheFileOnInstall): CachePathOnInstall {
  const paths = fileSpecsToPaths(strategy.files)
  return {
    strategy: 'cache-on-install',
    paths
  }
}

export function convertPreloadFilesToPreloadPaths(strategy: InputCacheStrategy): InputCacheStrategyAsPaths {
  if (isCacheFileOnInstall(strategy))
    return convertPreloadFilesToPaths(strategy)
  else
    return strategy
}

export function extractAllPreloadPaths(spec: Array<InputCacheStrategyAsPaths>): OutputPaths {
  return spec
    .filter(isCachePathOnInstall)
    .map(s => s.paths)
    .flat()
    .sort() as OutputPaths
}

export function convertPreloadPathsToCacheFirst(spec: Array<InputCacheStrategyAsPaths>): Array<RoutableStrategy<InputPaths>> {
  return spec.map(s =>
    isRoutableStrategy<InputPaths>(s)
      ? s
      : {
        strategy: 'cacheFirst',
        paths: s.paths
      } satisfies CacheFirstStrategy<InputPaths>)
}

export function convertAllPreloadFilesToPreloadPaths(spec: Array<InputCacheStrategy>): Array<InputCacheStrategyAsPaths> {
  return spec.map(convertPreloadFilesToPreloadPaths);
}
