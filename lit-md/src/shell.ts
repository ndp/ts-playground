import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs'
import { isAbsolute, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

export { test as example, test as metaExample, describe } from 'node:test'

// Module-level alias registry: name → resolved shell command string
const _aliases = new Map<string, string>()

/**
 * Register a shell alias. `cmdString` may be a plain path or a command with
 * arguments (e.g. `'node --experimental-strip-types ./cli.ts'`). Any token
 * that looks like a file path (contains `/` or starts with `.`) is resolved
 * relative to `process.cwd()` at call time. The resulting alias is prepended
 * to every shell command executed by `shell` or `shellExample`.
 *
 * Alias calls produce **no markdown output**.
 */
export function alias(name: string, cmdString: string): void {
  const resolved = resolveCmdPath(cmdString)
  _aliases.set(name, resolved)
}

/** Internal: clear all registered aliases. Used in tests for isolation. */
export function _clearAliases(): void {
  _aliases.clear()
}

/** Resolve path-like tokens in a command string to absolute paths. */
function resolveCmdPath(cmdString: string): string {
  return cmdString.replace(/\S+/g, token => {
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('../') ||
        (!isAbsolute(token) && token.includes('/'))) {
      return resolve(process.cwd(), token)
    }
    return token
  })
}

/** Build shell alias prefix lines to prepend to commands. */
function buildAliasPrefix(): string {
  if (_aliases.size === 0) return ''
  const lines = [..._aliases.entries()].map(([name, cmd]) => `alias ${name}='${cmd}'`)
  return lines.join('\n') + '\n'
}

/** Check if content matches a pattern (string or regex). */
function matchesPattern(content: string, pattern: string | RegExp): boolean {
  return pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern)
}

export interface ShellFileAssertion {
  path: string
  contains?: string | RegExp
  matches?: string | RegExp
  displayPath?: boolean | 'hidden'
  summary?: boolean
}

export interface ShellExampleOpts {
  stdout?: { contains?: string | RegExp; matches?: string | RegExp; display?: boolean }
  outputFiles?: ShellFileAssertion[]
  inputFiles?: Array<{ path: string; content: string; displayPath?: boolean | 'hidden'; summary?: boolean }>
  displayCommand?: boolean | 'hidden'
}

/** Internal: executes a shell command and runs any assertions. Throws on failure.
 *  Exported for direct testing. */
export function _runShellExample(cmd: string, opts: ShellExampleOpts): void {
  const tmpDir = mkdtempSync(join(tmpdir(), 'lit-md-shell-'))
  const resolvePath = (p: string) => isAbsolute(p) ? p : join(tmpDir, p)
  try {
    for (const f of opts.inputFiles ?? []) {
      writeFileSync(resolvePath(f.path), f.content, 'utf8')
    }
    const prefix = buildAliasPrefix()
    const fullCmd = prefix ? `${prefix}${cmd}` : cmd
    const result = spawnSync(fullCmd, { shell: true, encoding: 'utf8', cwd: tmpDir })
    if (result.status !== 0) {
      const err = result.stderr || result.error?.message || ''
      throw new Error(`Command failed: ${cmd}\nexit ${result.status ?? 'null'}${err ? ': ' + err : ''}`)
    }
    const stdout = result.stdout
    if (opts.stdout !== undefined) {
      if (opts.stdout.contains !== undefined) {
        assert.ok(
          matchesPattern(stdout, opts.stdout.contains),
          `stdout did not contain: ${JSON.stringify(opts.stdout.contains)}\nActual: ${JSON.stringify(stdout)}`
        )
      }
      if (opts.stdout.matches !== undefined) {
        assert.ok(
          matchesPattern(stdout, opts.stdout.matches),
          `stdout did not match: ${opts.stdout.matches}\nActual: ${JSON.stringify(stdout)}`
        )
      }
    }
    for (const fa of opts.outputFiles ?? []) {
      let content: string
      try {
        content = readFileSync(resolvePath(fa.path), 'utf8')
      } catch (e) {
        const err = e as NodeJS.ErrnoException
        if (err.code === 'ENOENT') {
          throw new Error(`Output file not found: ${fa.path}\n\nThe command may not have created this file, or it may be in a different location.\nCommand: ${cmd}`)
        }
        throw e
      }
      if (fa.contains !== undefined) {
        assert.ok(matchesPattern(content, fa.contains), `file ${fa.path} does not contain: ${JSON.stringify(fa.contains)}`)
      }
      if (fa.matches !== undefined) {
        assert.ok(matchesPattern(content, fa.matches), `file ${fa.path} does not match: ${fa.matches}`)
      }
    }
    // Clean up absolute-path inputFiles (relative ones are removed with tmpDir below)
    for (const f of opts.inputFiles ?? []) {
      if (isAbsolute(f.path)) try { unlinkSync(f.path) } catch {}
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
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
    stdout: stdoutAssertions.length ? { contains: stdoutAssertions.join('\n') } : undefined,
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

/**
 * Returns `'--experimental-strip-types'` on Node.js versions where the flag is required
 * (v22.6–v23.5), or `''` on versions where TypeScript stripping is stable (v23.6+).
 */
export function stripTypesFlag(): string {
  const parts = process.versions.node.split('.')
  const major = parseInt(parts[0] ?? '0', 10)
  const minor = parseInt(parts[1] ?? '0', 10)
  if (major === 22 && minor >= 6) return '--experimental-strip-types'
  if (major === 23 && minor < 6) return '--experimental-strip-types'
  return ''
}
