# Shell Commands

lit-md provides two ways to embed executable shell commands in documentation:
the `shell` tagged template and the `shellExample` structured function.
Both run the command as a test and emit a `sh` code block.
## shellExample — Basic

```sh
echo "ok"
# => ok
```

## shellExample — With stdout Assertion

```sh
node --version
# => v
```

## shellExample — With Output Files

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

## shellExample — With Regex Match

```ts tmp.ts
// Input file "tmp.ts":
// ## Section
import { example } from 'node:test'
```

```sh
lit-md tmp.ts
```

Output file `tmp.md` matches /^## Section/
