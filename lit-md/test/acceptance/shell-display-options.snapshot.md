# Shell Display Options

`shellExample` offers fine-grained control over what appears in the
generated documentation. These options affect only the rendered output —
the underlying assertions still run.
## stdout.display: true

By default, stdout is only shown when a `contains` or `matches` string is
provided. Set `stdout: { display: true }` to capture and show the actual
output without an assertion.

```ts
shellExample('echo "hello stdout"', {
  stdout: { display: true }
})
```

```sh
$ echo "hello stdout"
hello stdout
```

## displayCommand: false

Set `displayCommand: false` to suppress the `$ command` line entirely.
The command still runs — only the documentation is affected.
Combine with `stdout: { display: true }` to show just the output.

```ts
shellExample('echo "quiet output"', {
  displayCommand: false,
  stdout: { display: true }
})
```

```sh
quiet output
```

## inputFiles: displayPath false

By default, each input file is introduced with a prose label
(`With input file \`name\`:`).
Set `displayPath: false` to show the file content without the filename label.

```ts
shellExample('cat input.txt', {
  inputFiles: [{ path: 'input.txt', content: 'hello world', displayPath: false }]
})
```

```
hello world
```

```sh
$ cat input.txt
```

## inputFiles: display false
By default, input files are shown with their content and filename.
Set `display: false` to suppress the file content entirely.

```ts
shellExample('cat input.txt', {
  inputFiles: [{ path: 'input.txt', content: 'hello world', display: false }]
})
```

```sh
$ cat input.txt
```

## outputFiles: displayPath false

By default, output files are captioned with the filename and assertion text.
Set `displayPath: false` to show the content under a generic `Output:` label.

```sh
$ echo "result" > out.txt
```

Output:
```
result
```

## outputFiles: summary false

Set `summary: false` to suppress the prose caption entirely —
the file content is shown with no introductory line.

```sh
$ echo "42" > answer.txt
```

```
42
```
