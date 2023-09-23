import {
  convertAllPreloadFilesToPreloadPaths,
  convertPreloadPathsToCacheFirst,
  extractAllPreloadPaths,
  InputCacheStrategy, InputPaths, OutputPaths, RoutableStrategy
} from "./strategies";
import fs from "fs";

type InputSpec = Array<InputCacheStrategy>
type Version = string

export function generateServiceWorker(
  version: Version,
  inputSpec: InputSpec,
  debug = false): string {
  const spec = convertAllPreloadFilesToPreloadPaths(inputSpec)

  const preloadPaths = extractAllPreloadPaths(spec)

  const routable = convertPreloadPathsToCacheFirst(spec)

  return generateDebugFlag(debug) +
    generateVersion(version) +
    generatePreloadCode(preloadPaths) +
    generateRoutes(routable) +
    includeTemplate()
}

export function generateVersion(version: Version) {
  return `const VERSION = '${version}';\n`
}

export function generateDebugFlag(debug: boolean) {
  return `const DEBUG = ${debug};\n`
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
  return fs.readFileSync('./template.js')
}

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
