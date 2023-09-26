// Copyright (c) 2023 Andrew J. Peterson, dba NDP Software
import {
  convertAllPreloadFilesToPreloadPaths,
  convertPreloadPathsToCacheFirst,
  extractAllPreloadPaths,
  InputCacheStrategy, InputPaths, OutputPaths, RoutableStrategy
} from './strategies';
import fs from 'fs';
import * as Path from 'path';

export type Plan = Array<InputCacheStrategy>
type Version = string
type Options = {
  debug?: boolean
  skipWaiting?: boolean
}
const defaultOptions: Required<Options> = {
  debug: false,
  skipWaiting: false
}

export function generateServiceWorker(
  version: Version,
  inputSpec: Plan,
  optionsIn: Options = {}): string {

  const options: Required<Options> = {
    ...defaultOptions,
    ...optionsIn
  }

  const spec = convertAllPreloadFilesToPreloadPaths(inputSpec)

  const preloadPaths = extractAllPreloadPaths(spec)

  const routable = convertPreloadPathsToCacheFirst(spec)

  return generateFlag('DEBUG', options.debug) +
    generateFlag('SKIP_WAITING', options.skipWaiting) +
    generateVersion(version) +
    generatePreloadCode(preloadPaths) +
    generateRoutes(routable) +
    includeTemplate()
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
    .map((s) => `[${s.strategy}, ${pathsToJS(s.paths)}]`)
    .join(',\n  ')}];\n`
}

function includeTemplate() {
  return fs.readFileSync(Path.join(__dirname, './serviceWorker.template.js'))
}

function pathsToJS(paths: InputPaths) {
  const asArray = Array.isArray(paths)
    ? paths : [paths]
  return `[${asArray.map(pathToJS).join(',')}]`
}

function pathToJS(path: string | RegExp) {
  return typeof path === 'string'
    ? `'${path}'`
    : `${path}`
}
