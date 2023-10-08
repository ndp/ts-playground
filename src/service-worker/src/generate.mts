// Copyright (c) 2023 Andrew J. Peterson, dba NDP Software
import {
  convertAllFilesToPaths,
  convertPreloadPathsToCacheFirst,
  extractAllPreloadPaths,
  InputCacheStrategy, InputPaths, isStaticOfflineBackup, OriginAndBelow, OutputPaths, RoutableStrategy
} from './strategies.mjs';
import { TEMPLATE } from './serviceWorkerTemplate.mjs'

export type Plan = Array<InputCacheStrategy>
type Version = string
export type Options = {
  version?: Version
  debug?: boolean
  skipWaiting?: boolean
}
const defaultOptions: Required<Options> = {
  version: '0.0',
  debug: false,
  skipWaiting: false
}

/**
 * Produce a string that contains Javascript code to implement
 * the given caching `Plan`, taking into account options.
 *
 * Options:
 * - `version`: a semvar version for the cache in the user's browser. This
 *    is largely ignored, but importantly a major version bump
 *    will cause the cache to be rebuilt.
 * - `debug`: true will generate `console.log` notices for
 *    all activity in the service worker. It should be turned off in production.
 * - `skipWaiting`: setting to `true` has the same effect as
 *    calling the method as described in the service worker documention (but simpler!).
 */
export function generateServiceWorker(
  inputSpec: Plan,
  optionsIn: Options = {}): string {

  const options: Required<Options> = {
    ...defaultOptions,
    ...optionsIn
  }

  // The user may specify some paths as file paths, but these
  // will make no sense in a service worker. Convert all those
  // glob matches to URL matchable paths.
  const spec = convertAllFilesToPaths(inputSpec)

  // Search through all strategies and extract any paths that need
  // pre-loading.
  const preloadPaths = extractAllPreloadPaths(spec)

  // Preloaded paths are not only preloaded, but they are also
  // served from the cache.
  const routable = convertPreloadPathsToCacheFirst(spec)

  const varsBlock =
    generateFlag('DEBUG', options.debug) +
    generateFlag('SKIP_WAITING', options.skipWaiting) +
    generateVersion(options.version) +
    generatePreloadCode(preloadPaths) +
    generateRoutes(routable);

  return evalTemplate(varsBlock)
}

export function generateVersion(version: Version) {
  return `const VERSION = '${version}';\n`
}

export function generateFlag(name: string, bool: boolean) {
  return `const ${name} = ${bool};\n`
}

function generatePreloadCode(paths: OutputPaths) {
  return `const PRELOAD_PATHS = ${pathsToJS(paths)};\n`
}

function generateRoutes(spec: Array<RoutableStrategy<InputPaths>>) {
  return `const ROUTES = [\n  ${spec
    .map((s) => `[${s.strategy}, ${pathsToJS(s.paths)}${isStaticOfflineBackup(s) ? `, '${s.backup}'` : ''}]`)
    .join(',\n  ')}];\n`
}

function evalTemplate(variables: string) {
  // Very simple template evaluation...
  return TEMPLATE
    .replace('// VARIABLES', variables)
}

export function pathsToJS(paths: InputPaths) {
  const asArray = Array.isArray(paths)
    ? paths : [paths]
  return `[${asArray.map(pathToJS).join(',')}]`
}

export function pathToJS(path: string | RegExp | symbol) {
  switch (typeof path) {
    case 'string':
      return `'${path}'`
    case 'symbol':
      return path == OriginAndBelow ? 'ORIGIN_MATCHER' : 'SCOPE_MATCHER'
    default:
      return `${String(path)}`
  }
}
