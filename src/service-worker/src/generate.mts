// Copyright (c) 2023 Andrew J. Peterson, dba NDP Software
import {
  convertAllPreloadFilesToPreloadPaths,
  convertPreloadPathsToCacheFirst,
  extractAllPreloadPaths,
  InputCacheStrategy, InputPaths, isStaticOfflineBackup, Origin, OutputPaths, RoutableStrategy
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

export function generateServiceWorker(
  inputSpec: Plan,
  optionsIn: Options = {}): string {

  const options: Required<Options> = {
    ...defaultOptions,
    ...optionsIn
  }

  const spec = convertAllPreloadFilesToPreloadPaths(inputSpec)

  const preloadPaths = extractAllPreloadPaths(spec)

  const routable = convertPreloadPathsToCacheFirst(spec)

  const variables = generateFlag('DEBUG', options.debug) +
    generateFlag('SKIP_WAITING', options.skipWaiting) +
    generateVersion(options.version) +
    generatePreloadCode(preloadPaths) +
    generateRoutes(routable);
  return includeTemplate(variables)
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

function includeTemplate(variables: string) {
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
      return path == Origin ? 'ORIGIN_MATCHER' : 'SCOPE_MATCHER'
    default:
      return `${String(path)}`
  }
}
