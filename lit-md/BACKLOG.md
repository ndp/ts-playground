## Support for demonstrating command line usage

## Engine

## Markdown output

## Acceptance tests
npm run test:update should be `test:acceptance:update`, as it only applies to acceptance tests

## CLI
- [ ] please provide details of the stesp and added complexity for this feature. add a `--wait` to cli that will keep the process alive after generating the MD file. This allows users to inspect the generated file before the process exits, and also allows for easier debugging of the generation process. The process would exit when the user presses a key or sends a signal (e.g., Ctrl+C). WOrks in consort with --test and --typecheck if they were already turned on.

Typecheck errors should be highlightedin red or with an icon--- whatever other tools do to make it clear that there are type errors. This is especially important for users who are not used to working with the command line, as it can be easy to miss error messages if they are not prominently displayed.

the shellExample (and variables) should be robust. What if someone writes `shellExample('sleep 5')`? Is there any limit on this? Should there be a timeout for shell commands to prevent hanging? This is especially important if the command is run as part of a test suite, where a hanging command could block the entire suite.

RENDER

### shellExample: add the ability to suppress input file output in the markdown. 


## PUBLISHING

Publishing-prep checklist (not yet implemented)

5. Add build script — e.g. tsc -p tsconfig.build.json or esbuild for the CLI
6. Change "bin" — "./src/cli.ts" → "./dist/cli.js" (compiled JS)
8. Add metadata — keywords, repository, homepage fields
9. Consider a prepare script — runs build on npm install for consumers
