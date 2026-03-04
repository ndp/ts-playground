## Support for demonstrating command line usage

## Engine

outputFile: {
  path: string
  contains: string
  matches: string | RegExp
  display?: 'full' | 'none' // new field to control output display
}

## OUTPUT FILES are output with two sections:
- SUMMARY STRING
- FILE CONTENTS

## SUMMARY STRING

Generate a summary string:
- if "matches" set, it is "File <filename> matches <matches>"
- if "contains" set and is less than 60 characters and has no carriage returns, it is "File `<filename>` contains `<contains>`"
- if contains set and is 60 characters or more or has carraige returns, use "File `<filename>` contains <contains>..." (truncated to 60 chars or the first carriage return)
- else it is "File <filename>"

This summary string is followed by either a period or colon. This depends on whether there are FILE CONTENTS following the summary in the markdown output, which is determined by the "display" field and availability of the file contents. The rules are as follows:
- If there is no FILE CONTENTS to display in the markdown, end the summary with a period.
- If there is FILE CONTENTS to display in the markdown, end the summary with a colon.

## FILE CONTENTS

- and then display either the full file contents if available statically
- if "contains" is set to a multi-line value, use this as the FILE CONTENTS instead of the full file contents, even if the full file contents are available statically. To make this clear that is an excerpt, add a line to the top and bottom of the excerpt with three dots (e.g., "..." on its own line) to indicate that it is a truncated excerpt of the file contents.
- or "[not available]" if the file contents are not available statically (e.g., if the file is generated dynamically at runtime and cannot be read during markdown generation).





 
## Markdown output

- [ ] shell command should look more like shell commands, with > prompts and the command on the same line. This is more visually distinct and easier to read. For example:
```   
> echo "hello world"
hello world
``` 

/*
## Code blocks within comments

Code blocks inside comments are included in the output as-is, without needing an `example()`.
They are not run as part of the tests.
```typescript
const x = 42
console.log(x, x / 7, 'Hello', "world")
```
*/

### Omit some comments from output
Suggestion of //-  or /*-  to indicate that a comment should be omitted from the generated markdown output. This allows users to include comments in their code for clarity and documentation purposes without cluttering the generated documentation. The cli would simply ignore any comments that start with //- or /*- when generating the markdown output.


## Acceptance tests

### Generate one test per example directory

## CLI

- [ ] add a `--wait` to cli that will keep the process alive after generating the MD file. This allows users to inspect the generated file before the process exits, and also allows for easier debugging of the generation process. The process would exit when the user presses a key or sends a signal (e.g., Ctrl+C). WOrks in consort with --test and --typecheck if they were already implemented.


## PUBLISHING

Publishing-prep checklist (not yet implemented)

1. "private": false — remove from lit-md/package.json
2. Add "files" field — ["src", "dist"] (exclude test/, docs/, acceptance/)
3. Add "exports" + "main" — point to "./dist/index.js" with types at "./dist/index.d.ts"
4. Add tsconfig.build.json — emit-enabled config for src/ → dist/
5. Add build script — e.g. tsc -p tsconfig.build.json or esbuild for the CLI
6. Change "bin" — "./src/cli.ts" → "./dist/cli.js" (compiled JS)
7. Add "engines" — e.g. "node": ">=22" (if staying with .ts bin + strip-types)
8. Add metadata — keywords, repository, homepage fields
9. Consider a prepare script — runs build on npm install for consumers
10. Add "sideEffects": false — enables tree-shaking for bundlers