# Shell Commands: `shellExample`

lit-md provides two ways to embed executable shell commands in documentation:
the `shell` tagged template and the `shellExample` structured function.
Both run the command as a test and emit a `sh` code block.

## Basic

Using `shellExample('echo "ok"')` produces:

```sh
$ echo "ok"
```

## With stdout Assertion

Using `shellExample('node --version', { stdout: '24.11.0'})` produces:

```sh
$ node --version
24.11.0
```

## With Input and Output Files

`inputFiles` (optionally) creates a file of a given name with specific content
`outputFiles` verifies that specified files exist after the command runs
and contain expected content.

With input file `input.txt`:
```text input.txt
hello world
```

```sh
$ cp input.txt output.txt
```

Output file `output.txt` contains `hello world`:

```text output.txt
hello world
```

File contents can assert that they match a regex pattern:

With input file `input.txt`:
```text input.txt
first line
second line
```

```sh
$ cp input.txt output.txt
```

Output file `output.txt` matches `/^first/`:

```text output.txt
first line
second line
```

Larger files will display nicely in the emitted markdown, and regex assertions can verify just the relevant part:

With input file `input.txt`:
```text input.txt
first line
second line
third line
fourth line
```

```sh
$ sort input.txt >output.txt
```

Output file `output.txt` matches `/^first/`:

```text output.txt
first line
fourth line
second line
third line
```
