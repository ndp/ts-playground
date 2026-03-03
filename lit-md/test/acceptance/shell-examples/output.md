# Shell Commands: `shellExample`

lit-md provides two ways to embed executable shell commands in documentation:
the `shell` tagged template and the `shellExample` structured function.
Both run the command as a test and emit a `sh` code block.

## Basic

Using `shellExample('echo "ok"')` produces:

```sh
echo "ok"
```

## With stdout Assertion

Using `shellExample('node --version', { stdout: '24.11.0'})` produces:

```sh
node --version
# => 24.11.0
```

## With Input and Output Files

`inputFiles` (optionally) creates a file of a given name with specific content
`outputFiles` verifies that specified files exist after the command runs
and contain expected content.

```ts tmp.ts
// Input file "tmp.ts":
// # Hello
import { example } from 'node:test'
example('t', () => {})
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` contains "# Hello"

File contents can assert that they match a regex pattern:

```ts tmp.ts
// Input file "tmp.ts":
// ## Section
import { example } from 'node:test'
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` matches /^## Section/
