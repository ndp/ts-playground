## Support for demonstrating command line usage

## Engine


 
## Markdown output

- [ ] shell command should look more like shell commands, with > prompts and the command on the same line. This is more visually distinct and easier to read. For example:
```   
> echo "hello world"
hello world
``` 

### Omit some comments from output
Suggestion of //-  or /*-  to indicate that a comment should be omitted from the generated markdown output. This allows users to include comments in their code for clarity and documentation purposes without cluttering the generated documentation. The cli would simply ignore any comments that start with //- or /*- when generating the markdown output.


## Acceptance tests

### Generate one test per example directory

This will just require using the test runner's `describe()` function to group the examples in each directory, and then using `example()` to create a test for each example file. The test would run the cli on the example file and compare the generated markdown output to a reference markdown file that contains the expected output. This will ensure that each example is tested independently and that any changes to the code will not affect other examples.


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