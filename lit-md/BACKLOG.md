## Support for demonstrating command line usage

## Engine

 
## Markdown output


### Omit some comments from output
Suggestion of //-  or /*-  to indicate that a comment should be omitted from the generated markdown output. This allows users to include comments in their code for clarity and documentation purposes without cluttering the generated documentation. The cli would simply ignore any comments that start with //- or /*- when generating the markdown output.


## Acceptance tests

### Generate one test per example directory

## CLI

- [ ] add a `--wait` to cli that will keep the process alive after generating the MD file. This allows users to inspect the generated file before the process exits, and also allows for easier debugging of the generation process. The process would exit when the user presses a key or sends a signal (e.g., Ctrl+C). WOrks in consort with --test and --typecheck if they were already implemented.


## PUBLISHING

Publishing-prep checklist (not yet implemented)

5. Add build script — e.g. tsc -p tsconfig.build.json or esbuild for the CLI
6. Change "bin" — "./src/cli.ts" → "./dist/cli.js" (compiled JS)
8. Add metadata — keywords, repository, homepage fields
9. Consider a prepare script — runs build on npm install for consumers
