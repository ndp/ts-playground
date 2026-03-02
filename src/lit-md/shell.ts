import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

export interface ShellFileAssertion {
  path: string
  contains?: string
  matches?: RegExp
}

export interface ShellExampleOpts {
  stdout?: string
  outputFiles?: ShellFileAssertion[]
  inputFiles?: Array<{ path: string; content: string }>
}

/** Internal: executes a shell command and runs any assertions. Throws on failure.
 *  Exported for direct testing. */
export function _runShellExample(cmd: string, opts: ShellExampleOpts): void {
  for (const f of opts.inputFiles ?? []) {
    writeFileSync(f.path, f.content, 'utf8')
  }
  let stdout: string
  try {
    const result = spawnSync(cmd, { shell: true, encoding: 'utf8' })
    if (result.status !== 0) {
      const err = result.stderr || result.error?.message || ''
      throw new Error(`exit ${result.status ?? 'null'}${err ? ': ' + err : ''}`)
    }
    stdout = result.stdout
  } catch (e: any) {
    throw new Error(`Command failed: ${cmd}\n${e.message}`)
  }
  if (opts.stdout !== undefined) {
    assert.ok(
      stdout.includes(opts.stdout),
      `stdout did not contain: ${JSON.stringify(opts.stdout)}\nActual: ${JSON.stringify(stdout)}`
    )
  }
  for (const fa of opts.outputFiles ?? []) {
    const content = readFileSync(fa.path, 'utf8')
    if (fa.contains !== undefined) {
      assert.ok(content.includes(fa.contains), `file ${fa.path} does not contain: ${JSON.stringify(fa.contains)}`)
    }
    if (fa.matches !== undefined) {
      assert.ok(fa.matches.test(content), `file ${fa.path} does not match: ${fa.matches}`)
    }
  }
  for (const f of opts.inputFiles ?? []) {
    try { unlinkSync(f.path) } catch {}
  }
}

/** Parses a shell template string into commands and assertions, then executes them. */
export function _runShell(templateText: string): void {
  const lines = templateText.split('\n').map(l => l.trim())
  const commands: string[] = []
  const stdoutAssertions: string[] = []
  const outputFiles: ShellFileAssertion[] = []

  for (const line of lines) {
    if (line === '') continue
    if (line.startsWith('# => ')) {
      stdoutAssertions.push(line.slice(5))
    } else if (line.startsWith('# file: ')) {
      const fa = parseFileAnnotation(line.slice(8))
      if (fa) outputFiles.push(fa)
    } else if (!line.startsWith('#')) {
      commands.push(line)
    }
  }

  if (!commands.length) return
  _runShellExample(commands.join('\n'), {
    stdout: stdoutAssertions.length ? stdoutAssertions.join('\n') : undefined,
    outputFiles: outputFiles.length ? outputFiles : undefined
  })
}

function parseFileAnnotation(text: string): ShellFileAssertion | null {
  // "path contains "text""
  const containsMatch = text.match(/^(\S+)\s+contains\s+"(.*)"$/)
  if (containsMatch) return { path: containsMatch[1]!, contains: containsMatch[2]! }

  // "path matches /regex/"
  const matchesMatch = text.match(/^(\S+)\s+matches\s+(.+)$/)
  if (matchesMatch) {
    try {
      const m = matchesMatch[2]!.match(/^\/(.+)\/([gimsuy]*)$/)
      if (m) return { path: matchesMatch[1]!, matches: new RegExp(m[1]!, m[2]) }
    } catch {}
  }
  return null
}

/** Registers a node:test test for a shell`` tagged template. */
export function shell(strings: TemplateStringsArray): void {
  const text = strings.raw.join('')
  // Extract first command as test name
  const firstCmd = text.split('\n').map(l => l.trim()).find(l => l.length > 0 && !l.startsWith('#')) ?? text.trim()
  test(firstCmd, () => _runShell(text))
}

/** Registers a node:test test that executes the shell command and verifies assertions. */
export function shellExample(cmd: string, opts: ShellExampleOpts = {}): void {
  test(cmd, () => _runShellExample(cmd, opts))
}
