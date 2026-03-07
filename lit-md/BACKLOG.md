## Support for demonstrating command line usage

## Engine


Plan and implement the following features and fixes. Each is separate and should be treated as such. Do the easy ones that do not require any more information first, and then ask me about the other ones. Read DEVELOPMENT.md. Make sure to git commit after each feature or fix is implemented, with a clear commit message describing the change:

1. shellCommand should fail if the command returns a non-zero exit code

2. shellCommand should allow assertions on the exit code. For example:
```ts
shellExample('ls /nonexistent', { exitCode: 2 })
``` 

3 for shellCommand, if the "contains" assertion fails, it should show the actual output that was generated, especially if there is not a good diff. For example, if the output file was empty, it should indicate that the output was empty rather than just showing a diff of an empty string.

3. when `example` is generating markup, in meta mode or not, it should be able to handle `describe` with quotes in the name-- and in fact handle quoting correctly for any case. eg. `describe('My Project's README.', ...`  ie. it should not generate incorrect typescript. Create test cases and fixes if needed.
 
## Markdown output


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
