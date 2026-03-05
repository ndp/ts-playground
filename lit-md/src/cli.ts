#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, basename, extname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parse } from './parser.ts'
import { render } from './renderer.ts'
import { typecheck } from './typecheck.ts'
import { stripTypesFlag } from './shell.ts'
import { resolveOutputFiles } from './resolver.ts'

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
  if (idx === -1) {
    // Check for --flag=value format
    const eqIdx = args.findIndex(arg => arg.startsWith(flag + '='))
    if (eqIdx === -1) return undefined
    const value = args[eqIdx]!.slice(flag.length + 1)
    args.splice(eqIdx, 1)
    return value
  }
  const value = args[idx + 1]
  args.splice(idx, 2)
  return value
}

const showHelp = extractFlag('--help') || extractFlag('-h')
const dryrun = extractFlag('--dryrun')
const runTests = extractFlag('--test')
const runTypecheck = extractFlag('--typecheck')
const updateSnapshots = extractFlag('--update-snapshots') || extractFlag('-u')
const outFlag = extractFlagValue('--out')
const outputDir = extractFlagValue('--outputDir')
const describeFormat = extractFlagValue('--describe') || 'hidden'

const inputPaths = args.filter(a => !a.startsWith('--'))

// --- Help ---

if (showHelp) {
  console.log(`lit-md - Generate markdown documentation from test files

Usage: lit-md [options] <file.ts|js> [file2 ...]

Options:
  --help, -h                Show this help message
  --test                    Run tests before generating markdown
  --typecheck               Run type checking before generating markdown
  --dryrun                  Show what would be written without writing files
  -u, --update-snapshots    Update snapshot files instead of generating markdown
  --out <output.md>         Write to a specific output file (requires single input)
  --outputDir <dir>         Write generated markdown files to this directory
  --describe <format>       Control describe() block rendering (default: hidden)
                            Formats: hidden, #, ##, ###, ####
                            With header formats, nesting is supported

Examples:
  lit-md README.md.test.ts
  lit-md --test --typecheck README.md.test.ts
  lit-md --out /tmp/docs.md README.md.test.ts
  lit-md --outputDir ./docs src/**/*.md.test.ts
  lit-md --describe="#" README.md.test.ts
`)
  process.exit(0)
}

// --- Validation ---

if (!inputPaths.length) {
  console.error('Usage: lit-md [--test] [--typecheck] [--dryrun] [-u|--update-snapshots] [--out <output.md>] [--outputDir <dir>] <file.ts|js> [file2 ...]')
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
  const stripFlag = stripTypesFlag()
  const nodeArgs = ['--test', ...(stripFlag ? [stripFlag] : []), ...inputPaths.map(p => resolve(p))]
  const result = spawnSync(process.execPath, nodeArgs, { stdio: 'inherit', env: process.env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// --- Generate markdown ---

for (const inputPath of inputPaths) {
  const src = readFileSync(inputPath, 'utf8')
  const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
  let nodes = parse(src, lang)
  if (!dryrun) {
    nodes = resolveOutputFiles(nodes)
  }
  const md = render(nodes, describeFormat)

  let outPath: string
  if (updateSnapshots) {
    const base = basename(inputPath, extname(inputPath))
    outPath = join(dirname(resolve(inputPath)), `${base}.snapshot.md`)
  } else if (outFlag) {
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

