# Shell Commands

lit-md provides the `shellExample` function to embed executable shell commands in documentation.
It runs the command as a test and emits a `sh` code block.
## Basic Commands

Use `shellExample('command')` to run a command and verify it exits successfully.

```sh
$ echo "hello world"
```

### Asserting stdout

Use `stdout: { contains: '...' }` to assert that stdout contains a substring.

```sh
$ echo "ready"
ready
```

### Asserting file output

Use `outputFiles` to assert that a file created by the command contains expected content.

```sh
$ echo "hello" > greeting.txt
```

Output file `greeting.txt` contains `hello`:
```
hello
```

## Multiple Commands

Join multiple commands with `&&` to run them in sequence and emit a single `sh` block.

```sh
$ echo "first" && echo "second"
```
