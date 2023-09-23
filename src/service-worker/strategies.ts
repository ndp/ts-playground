// Preload and cache any number of files enumerated from disk
// Implies 'cacheFirst'.
import {fileSpecsToPaths, FilesSpec} from "./files-specs";

export type CacheFileOnInstall = {
  strategy: 'cache-on-install',
  files: FilesSpec
}

// Preload and cache enumerated paths
export type CachePathOnInstall<Paths> = {
  strategy: 'cache-on-install',
  paths: Paths
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

export type CacheOnInstallStrategy = CachePathOnInstall<InputPaths>
  | CacheFileOnInstall

export type InputCacheStrategy = RoutableStrategy<InputPaths> | CacheOnInstallStrategy
export type InputCacheStrategyAsPaths = RoutableStrategy<InputPaths> | CachePathOnInstall<InputPaths>

export type InputPaths =
  RegExp | string | OutputPaths

// Convert to always be an array
export type OutputPaths = Array<string | RegExp>

export function isRoutableStrategy<Paths>(x: { strategy: string }): x is RoutableStrategy<Paths> {
  return x.strategy === 'cacheFirst'
    || x.strategy === 'networkFirst'
    || x.strategy === 'staleWhileRevalidate'
    || x.strategy === 'networkOnly'
}


export function isPreloadFiles(s: { strategy: string }): s is CacheFileOnInstall {
  return s.strategy === 'cache-on-install' && 'files' in s
}

export function isPreloadPaths(s: { strategy: string }): s is CachePathOnInstall<unknown> {
  return s.strategy === 'cache-on-install' && 'paths' in s
}


export function convertPreloadFilesToPaths(strategy: CacheFileOnInstall): CachePathOnInstall<InputPaths> {
  const paths = fileSpecsToPaths(strategy.files)
  return {
    strategy: 'cache-on-install',
    paths
  }
}

export function convertPreloadFilesToPreloadPaths(strategy: InputCacheStrategy): InputCacheStrategyAsPaths {
  if (isPreloadFiles(strategy))
    return convertPreloadFilesToPaths(strategy)
  else
    return strategy
}

export function extractAllPreloadPaths(spec: Array<InputCacheStrategyAsPaths>): OutputPaths {
  return spec
    .filter(isPreloadPaths)
    .map(s => s.paths)
    .flat()
    .sort()
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
