#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, basename, extname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parse } from './parser.ts'
import { render } from './renderer.ts'
import { typecheck } from './typecheck.ts'
import { stripTypesFlag } from './shell.ts'
import { resolveOutputFiles } from './resolver.ts'
import { resolveDescribeFormat, resetDescribeFormat } from './describe-format.ts'

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
const outputDir = extractFlagValue('--outDir')
const describeFormat = extractFlagValue('--describe') || '##'

const inputPaths = args.filter(a => !a.startsWith('--'))

// --- File name rewriting helper ---

function getOutputFileName(inputPath: string): string {
  const base = basename(inputPath)
  // Check if file ends with .lit-md.ts or .lit-md.js pattern
  if (base.endsWith('.lit-md.ts') || base.endsWith('.lit-md.js')) {
    // Remove the entire .lit-md.ts or .lit-md.js extension
    return base.slice(0, -(base.endsWith('.lit-md.ts') ? '.lit-md.ts'.length : '.lit-md.js'.length)) + '.md'
  }
  // Otherwise, remove the final extension (.ts, .js, etc.) and add .md
  return basename(inputPath, extname(inputPath)) + '.md'
}

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
  --outDir <dir>           Write generated markdown files to this directory
  --describe <format>       Control describe() block rendering (default: ##)
                            Formats:
                              hidden  - Omit describes
                              #       - Render as h1 headers, nested as h2, h3, etc.
                              ##      - Render as h2 headers, nested as h3, h4, etc. (default)
                              ###     - Render as h3 headers, nested as h4, h5, etc.
                              ####    - Render as h4 headers, nested as h5, h6, etc.
                              auto    - Dynamically determine level based on document structure
                                        (h1 if no headers exist, else one level deeper than last header)

Examples:
  lit-md README.md.test.ts
  lit-md --test --typecheck README.md.test.ts
  lit-md --out /tmp/docs.md README.md.test.ts
  lit-md --outDir ./docs src/**/*.md.test.ts
  lit-md --describe="#" README.md.test.ts
  lit-md --describe="auto" README.md.test.ts
`)
  process.exit(0)
}

// --- Validation ---

if (!inputPaths.length) {
  console.error('Usage: lit-md [--test] [--typecheck] [--dryrun] [-u|--update-snapshots] [--out <output.md>] [--outDir <dir>] <file.ts|js> [file2 ...]')
  process.exit(1)
}

const validDescribeFormats = ['hidden', 'auto', '#', '##', '###', '####']
if (!validDescribeFormats.includes(describeFormat)) {
  console.error(`error: invalid --describe format: ${describeFormat}. Valid formats: ${validDescribeFormats.join(', ')}`)
  process.exit(1)
}

if (outFlag && outputDir) {
  console.error('error: --out and --outDir are mutually exclusive')
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

;(async () => {
  for (const inputPath of inputPaths) {
    // Reset the describe format override before processing each file
    resetDescribeFormat()
    
    // Import the file to allow module-level setup (like setDescribeFormat calls)
    const absolutePath = resolve(inputPath)
    try {
      await import(absolutePath)
    } catch {
      // File might not be valid JavaScript/TypeScript module, continue
    }
    
    const src = readFileSync(inputPath, 'utf8')
    const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
    let nodes = parse(src, lang)
    if (!dryrun) {
      nodes = resolveOutputFiles(nodes)
    }
    // Use resolved format (CLI value + file override)
    const finalDescribeFormat = resolveDescribeFormat(describeFormat)
    const md = render(nodes, finalDescribeFormat)

    let outPath: string
    if (updateSnapshots) {
      const outputFileName = getOutputFileName(inputPath)
      const fileNameWithoutMd = outputFileName.slice(0, -3) // Remove .md
      outPath = join(dirname(resolve(inputPath)), `${fileNameWithoutMd}.snapshot.md`)
    } else if (outFlag) {
      outPath = outFlag
    } else if (outputDir) {
      mkdirSync(outputDir, { recursive: true })
      outPath = join(outputDir, getOutputFileName(inputPath))
    } else {
      outPath = join(dirname(inputPath), getOutputFileName(inputPath))
    }

    if (dryrun) {
      console.log(`dry run: would write ${outPath}`)
    } else {
      writeFileSync(outPath, md + '\n', 'utf8')
      console.log(`wrote ${outPath}`)
    }
  }
})()


