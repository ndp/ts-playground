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
```
hello world
```

```sh
$ cp input.txt output.txt
```

Output file `output.txt` contains `hello world`:
```
hello world
```

File contents can assert that they match a regex pattern:

With input file `input.txt`:
```
first line
second line
```

```sh
$ cp input.txt output.txt
```

Output file `output.txt` matches `/^first/`:
```
first line
second line
```

Larger files will display nicely in the emitted markdown, and regex assertions can verify just the relevant part:

With input file `input.txt`:
```
first line
second line
third line
fourth line
```

```sh
$ sort input.txt >output.txt
```

Output file `output.txt` matches `/^first/`:
```
first line
fourth line
second line
third line
```

## Output Files Without Assertions

You can also display output file contents without any `contains` or `matches` assertion:

```sh
$ echo "Hello, World!" > greeting.txt
```

Output file `greeting.txt`:
```
Hello, World!
```

## Stdout will output to the console

```sh
$ node ./src/lit-md.js --help
```

Sometimes file names are not important

With input file `input.txt`:
```
first line
second line
third line
fourth line
```

Output file `output.txt` matches `/^first/`:
```
first line
fourth line
second line
third line
```
