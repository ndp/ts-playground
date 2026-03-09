## Support for demonstrating command line usage

## Engine

## Markdown output

## Acceptance tests
npm run test:update should be `test:acceptance:update`, as it only applies to acceptance tests

## CLI

### RENDER

### shellExample: add the ability to suppress input file output in the markdown. 


## PUBLISHING

Publishing-prep checklist (not yet implemented)

5. Add build script — e.g. tsc -p tsconfig.build.json or esbuild for the CLI
6. Change "bin" — "./src/cli.ts" → "./dist/cli.js" (compiled JS)
8. Add metadata — keywords, repository, homepage fields
9. Consider a prepare script — runs build on npm install for consumers
