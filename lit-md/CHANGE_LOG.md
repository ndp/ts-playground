# Change Log

## [Unreleased]

## Added

- `exitCode` option for `shellExample()`: Assert the command exits with a specific exit code. For example, `shellExample('ls /nonexistent', { exitCode: 2 })` verifies the command exits with code 2. Commands with a non-zero `exitCode` display a `# exits: N` annotation in the generated `sh` block.

- `meta` option for `shellExample()`: When set to `true`, outputs a fenced code block showing the `shellExample` call itself before the command output, with the `meta: true` option removed for cleaner documentation.

## Fixed

- **Engine**: `shellExample` assertion failures on `outputFiles.contains` and `outputFiles.matches` now include the actual file content in the error message. When the file is empty, the message says `(empty)` instead of showing a confusing empty diff.

- **Engine**: `shellExample` with `meta: true` now correctly escapes backslashes and special characters (e.g. `\n`, `\r`) in the command string when reconstructing the TypeScript `shellExample(...)` call. Previously, a command containing a literal backslash could generate invalid TypeScript.

