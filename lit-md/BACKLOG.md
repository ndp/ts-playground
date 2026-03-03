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

- [ ] allow for multiple input files for the cli. files would be output in the same folder with a .md extension.
- [ ] allow for --outputDir option to specify the output directory for the generated markdown files. This allows users to keep their generated documentation organized and separate from their source code. The cli would create the output directory if it does not exist, and would place the generated markdown files in that directory. If not specified, the generated markdown files would be placed in the same directory as the input files.
- [ ] support `--dryrun` option to the cli that will run the type checking and tests, but will not generate the MD file. This allows users to verify that their code is correct and that their tests pass before generating the documentation. The process would exit with a success or failure code depending on the results of the type checking and tests. Works in consort with --test and --typecheck if they were already implemented.
- [ ] add `--typecheck` option to cli that will run the type checking using typescript engine. Saves the user the hassle of making a new project file, or passing lots of parameters. It would run before the MD generation. Failure of type checking would prevent the MD generation, and the error messages would be printed to the console.
- [ ] add `--test` option to cli that will run the input files as tests using node test runner. It would run before the MD generation. Failure prevents the MD generation, and the error is printed to the console.
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