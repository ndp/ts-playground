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


## FILE CONTENTS

- and then display either the full file contents if available statically
- if "contains" is set to a multi-line value, use this as the FILE CONTENTS instead of the full file contents, even if the full file contents are available statically. To make this clear that is an excerpt, add a line to the top and bottom of the excerpt with three dots (e.g., "..." on its own line) to indicate that it is a truncated excerpt of the file contents.
- or "[not available]" if the file contents are not available statically (e.g., if the file is generated dynamically at runtime and cannot be read during markdown generation).





 
## Markdown output


### Omit some comments from output
Suggestion of //-  or /*-  to indicate that a comment should be omitted from the generated markdown output. This allows users to include comments in their code for clarity and documentation purposes without cluttering the generated documentation. The cli would simply ignore any comments that start with //- or /*- when generating the markdown output.


## Acceptance tests

### Generate one test per example directory

## CLI

- [ ] add a `--wait` to cli that will keep the process alive after generating the MD file. This allows users to inspect the generated file before the process exits, and also allows for easier debugging of the generation process. The process would exit when the user presses a key or sends a signal (e.g., Ctrl+C). WOrks in consort with --test and --typecheck if they were already implemented.

the cli needs a --help option to explain the purpose of all the options. They can be concise, but not cryptic.


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