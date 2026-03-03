#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname, basename, extname, resolve } from 'path'
import { spawnSync } from 'child_process'
import { parse } from './parser.ts'
import { render } from './renderer.ts'
import { typecheck } from './typecheck.ts'

// --- Argument parsing ---

const args = process.argv.slice(2)

function extractFlag(flag: string): boolean {
  const idx = args.indexOf(flag)
  if (idx === -1) return false
  args.splice(idx, 1)
  return true
}

function extractFlagValue(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx === -1) return undefined
  const value = args[idx + 1]
  args.splice(idx, 2)
  return value
}

const dryrun = extractFlag('--dryrun')
const runTests = extractFlag('--test')
const runTypecheck = extractFlag('--typecheck')
const outFlag = extractFlagValue('--out')
const outputDir = extractFlagValue('--outputDir')

const inputPaths = args.filter(a => !a.startsWith('--'))

// --- Validation ---

if (!inputPaths.length) {
  console.error('Usage: lit-md [--test] [--typecheck] [--dryrun] [--out <output.md>] [--outputDir <dir>] <file.ts|js> [file2 ...]')
  process.exit(1)
}

if (outFlag && outputDir) {
  console.error('error: --out and --outputDir are mutually exclusive')
  process.exit(1)
}

if (outFlag && inputPaths.length > 1) {
  console.error('error: --out can only be used with a single input file')
  process.exit(1)
}

if (runTypecheck) {
  const jsFiles = inputPaths.filter(f => extname(f) === '.js')
  if (jsFiles.length) {
    console.error(`error: --typecheck requires .ts files; received: ${jsFiles.join(', ')}`)
    process.exit(1)
  }
}

// --- Typecheck ---

if (runTypecheck) {
  const result = typecheck(inputPaths.map(p => resolve(p)))
  if (!result.ok) {
    for (const msg of result.messages) console.error(msg)
    process.exit(1)
  }
}

// --- Run tests ---

if (runTests) {
  const result = spawnSync(
    process.execPath,
    ['--test', '--experimental-strip-types', ...inputPaths.map(p => resolve(p))],
    { stdio: 'inherit', env: process.env }
  )
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// --- Generate markdown ---

for (const inputPath of inputPaths) {
  const src = readFileSync(inputPath, 'utf8')
  const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
  const nodes = parse(src, lang)
  const md = render(nodes)

  let outPath: string
  if (outFlag) {
    outPath = outFlag
  } else if (outputDir) {
    mkdirSync(outputDir, { recursive: true })
    outPath = join(outputDir, basename(inputPath, extname(inputPath)) + '.md')
  } else {
    outPath = join(dirname(inputPath), basename(inputPath, extname(inputPath)) + '.md')
  }

  if (dryrun) {
    console.log(`dry run: would write ${outPath}`)
  } else {
    writeFileSync(outPath, md + '\n', 'utf8')
    console.log(`wrote ${outPath}`)
  }
}

