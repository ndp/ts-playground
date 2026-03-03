#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { parse } from './parser.ts'
import { render } from './renderer.ts'

const args = process.argv.slice(2)
const outFlagIdx = args.indexOf('--out')
let outputPath: string | undefined
if (outFlagIdx !== -1) {
  outputPath = args[outFlagIdx + 1]
  args.splice(outFlagIdx, 2)
}

const [inputPath] = args

if (!inputPath) {
  console.error('Usage: lit-md <file.ts> [--out <output.md>]')
  process.exit(1)
}

const src = readFileSync(inputPath, 'utf8')
const lang = extname(inputPath) === '.js' ? 'javascript' : 'typescript'
const nodes = parse(src, lang)
const md = render(nodes)

const outPath = outputPath ?? join(dirname(inputPath), basename(inputPath, extname(inputPath)) + '.md')
writeFileSync(outPath, md + '\n', 'utf8')
console.log(`wrote ${outPath}`)
