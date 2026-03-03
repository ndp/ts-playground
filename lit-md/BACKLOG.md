## Support for demonstrating command line usage

## Engine


 
## Markdown output

- -- [ ] Let's fix output file emission in markdown. It should never be in the same block as the typescript or shell script. If it is short, it should be a text node, like 'Output file `tmp.md` contains
  "// => 5"'. If it is longer than say 60 characters (or multiline-- we need both tests), then add text node: 'Output file `tmp.md` contains:` and follow it by a code block
  with the contents.
- [ ] shell command should look more like shell commands, with > prompts and the command on the same line. This is more visually distinct and easier to read. For example:
```   
> echo "hello world"
hello world
``` 
- [ ] add support for generating documentation from JavaScript files in addition to TypeScript files. This would allow users who are not using TypeScript to still benefit from the tool. The cli would detect the file type based on the extension (.js or .ts) and would process the files accordingly. For JavaScript files, type checking would be skipped, but tests would still be run if the --test option is specified. The generated markdown files would have the same name as the input files, but with a .md extension.

## Acceptance tests

### Generate one test per example directory

This will just require using the test runner's `describe()` function to group the examples in each directory, and then using `example()` to create a test for each example file. The test would run the cli on the example file and compare the generated markdown output to a reference markdown file that contains the expected output. This will ensure that each example is tested independently and that any changes to the code will not affect other examples.


## CLI

- [ ] allow for multiple input files for the cli. files would be output in the same folder with a .md extension.
- [ ] allow for --outputDir option to specify the output directory for the generated markdown files. This allows users to keep their generated documentation organized and separate from their source code. The cli would create the output directory if it does not exist, and would place the generated markdown files in that directory. If not specified, the generated markdown files would be placed in the same directory as the input files.
- [ ] support `--dryrun` option to the cli that will run the type checking and tests, but will not generate the MD file. This allows users to verify that their code is correct and that their tests pass before generating the documentation. The process would exit with a success or failure code depending on the results of the type checking and tests. Works in consort with --test and --typecheck if they were already implemented.
- [ ] add `--typecheck` option to cli that will run the type checking using typescript engine. Saves the user the hassle of making a new project file, or passing lots of parameters. It would run before the MD generation. Failure of type checking would prevent the MD generation, and the error messages would be printed to the console.
- [ ] add `--test` option to cli that will run the tests using node test runner. Saves the user the hassle of making a new project file, or passing lots of parameters. It would run before the MD generation. Failure prevents the MD generation, and the error is printed to the console.
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