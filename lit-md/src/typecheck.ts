import ts from 'typescript'
import { join } from 'path'

export interface TypecheckResult {
  ok: boolean
  messages: string[]
}

export function typecheck(files: string[]): TypecheckResult {
  // Only look for tsconfig.json in the exact CWD (no upward walk).
  // This matches the user's expectation: run lit-md from the project root,
  // and if a tsconfig.json is there, it will be used.
  const tsConfigPath = join(process.cwd(), 'tsconfig.json')
  const configPath = ts.sys.fileExists(tsConfigPath) ? tsConfigPath : undefined

  let compilerOptions: ts.CompilerOptions

  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
    if (configFile.error) {
      return { ok: false, messages: [ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')] }
    }
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ts.sys.getCurrentDirectory())
    compilerOptions = { ...parsed.options, noEmit: true }
  } else {
    // Sensible defaults when no tsconfig.json is present
    compilerOptions = {
      strict: true,
      noEmit: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ESNext,
      allowImportingTsExtensions: true,
    }
  }

  const program = ts.createProgram(files, compilerOptions)
  const diagnostics = ts.getPreEmitDiagnostics(program)

  if (!diagnostics.length) return { ok: true, messages: [] }

  const messages = diagnostics.map(d => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n')
    if (d.file && d.start !== undefined) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start)
      return `${d.file.fileName}(${line + 1},${character + 1}): error TS${d.code}: ${msg}`
    }
    return `error TS${d.code}: ${msg}`
  })

  return { ok: false, messages }
}

