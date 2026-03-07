## Support for demonstrating command line usage

## Engine


## Markdown output

lit-md/test/acceptance/keep-full.ts doesn't actually use the keep:full options, so it should be
updated to actually use it

## Acceptance tests
npm run test:update should be `test:acceptance:update`, as it only applies to acceptance tests


## CLI

- [ ] add a `--wait` to cli that will keep the process alive after generating the MD file. This allows users to inspect the generated file before the process exits, and also allows for easier debugging of the generation process. The process would exit when the user presses a key or sends a signal (e.g., Ctrl+C). WOrks in consort with --test and --typecheck if they were already implemented.

- unknown CLI options should produce an error and not run.
- outputDir should be renamed outDir.

RENDER

### shellExample: add the ability to suppress input file output in the markdown. 


## PUBLISHING

Publishing-prep checklist (not yet implemented)

5. Add build script — e.g. tsc -p tsconfig.build.json or esbuild for the CLI
6. Change "bin" — "./src/cli.ts" → "./dist/cli.js" (compiled JS)
8. Add metadata — keywords, repository, homepage fields
9. Consider a prepare script — runs build on npm install for consumers
