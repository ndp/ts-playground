## Support for demonstrating command line usage

## Engine
shellCommand returnCode assertions

 
## Markdown output

Add a new CLI option --describe=<format>.
Formats are:
  --describe=hidden (default): current behavior; describes are omitted from markdown output
  --describe="#": describes are converted to markdown headers  "#" (h1)
  --describe="##": describes are converted to markdown headers  "##" (h2)
  --describe="###": describes are converted to markdown headers  "###" (h3)
  --describe="####": describes are converted to markdown headers  "####" (h4)

If any of the header formats is chosen, nesting is supported. If a describe is nested
inside another describe, it should be converted to a header that is one level deeper than its parent. For example, if the top-level describe is converted to "##", then a nested describe would be converted to "###", and a describe nested inside that would be converted to "####", and so on. If the user chooses the "hidden" format, describes will be omitted from the markdown output as they are currently.

Update --help text.

Provide acceptance tests for each format option, including nested describes.

Update docs/README.lit-md.ts to reflect new --describe option and its behavior.


## Acceptance tests
npm run test:update should be `test:acceptance:update`, as it only applies to acceptance tests

when an acceptance test runs, if there is no snapshot, it should generate one (and not fail)


## CLI

- [ ] add a `--wait` to cli that will keep the process alive after generating the MD file. This allows users to inspect the generated file before the process exits, and also allows for easier debugging of the generation process. The process would exit when the user presses a key or sends a signal (e.g., Ctrl+C). WOrks in consort with --test and --typecheck if they were already implemented.

- unknown CLI options should produce an error and not run.
- outputDir should be renamed outDir.

RENDER

### shellExample: add the ability to suppress input file output in the markdown. 


Should report error if script returns non-zero exit code.

Should  be able to assert on exit code with something like:
```ts
shellExample('ls /nonexistent', { exitCode: 2 })
``` 

If a "contains" fails, it needs to show you the actual content that was generated if there is not a good diff. For the output file I had, which was empty, it wasn't obvious what happened.


Describe should be able to handle quotes better, with escaping. For example:
describe('My Project's README.', () => {


## PUBLISHING

Publishing-prep checklist (not yet implemented)

5. Add build script — e.g. tsc -p tsconfig.build.json or esbuild for the CLI
6. Change "bin" — "./src/cli.ts" → "./dist/cli.js" (compiled JS)
8. Add metadata — keywords, repository, homepage fields
9. Consider a prepare script — runs build on npm install for consumers
