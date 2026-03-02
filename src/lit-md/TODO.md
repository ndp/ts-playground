## Support for demonstrating command line usage

## Engine

Let's support an "alias" function. THis can be imported into the typescript like the other few methods. It takes two parameters. The first is a string that is the "alias" or name. The second is the path to a shell command. This can be a full path, or it can be relative to the cwd. If it is relative, it will need to be converted to a full path internally. A call to this method does not show up in the markdown output. When a shell command is issued, this alias is established in the shell. This will allow commands to be written with shorter, perhaps more correct names. It will also allow running commands in tmp directories and not polluting the current repository. Now input/output files can be generated in tmp directories and the command can be run their. The alias will fine the correct command path. Full tests to support this feature. This may mean reworking some of the existing test to use aliases instead of hard-coded paths. Add examples to acceptance test. Make sure you're no longer generating tmp.md and tmp.ts files in the lit-md folder.
 
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
