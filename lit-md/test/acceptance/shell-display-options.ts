// # Shell Display Options
//
// `shellExample` offers fine-grained control over what appears in the
// generated documentation. These options affect only the rendered output —
// the underlying assertions still run.

import { shellExample } from '../../src/index.ts'

// ## stdout.display: true
//
// By default, stdout is only shown when a `contains` or `matches` string is
// provided. Set `stdout: { display: true }` to capture and show the actual
// output without an assertion.

shellExample('echo "hello stdout"', {
  stdout: { display: true }
})

// ## displayCommand: false
//
// Set `displayCommand: false` to suppress the `$ command` line entirely.
// The command still runs — only the documentation is affected.
// Combine with `stdout: { display: true }` to show just the output.

shellExample('echo "quiet output"', {
  displayCommand: false,
  stdout: { display: true }
})

// ## inputFiles: displayPath false
//
// By default, each input file is introduced with a prose label
// (`With input file \`name\`:`).
// Set `displayPath: false` to show the file content without the filename label.

shellExample('cat input.txt', {
  inputFiles: [{ path: 'input.txt', content: 'hello world', displayPath: false }]
})

// ## outputFiles: displayPath false
//
// By default, output files are captioned with the filename and assertion text.
// Set `displayPath: false` to show the content under a generic `Output:` label.

shellExample('echo "result" > out.txt', {
  outputFiles: [{ path: 'out.txt', displayPath: false }]
})

// ## outputFiles: summary false
//
// Set `summary: false` to suppress the prose caption entirely —
// the file content is shown with no introductory line.

shellExample('echo "42" > answer.txt', {
  outputFiles: [{ path: 'answer.txt', contains: '42', summary: false }]
})
