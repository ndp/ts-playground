## Support for demonstrating command line usage

- [x] create an acceptance folder with subfolders of examples. Each subfolder has a descriptive name, kabob-case, and contains a lit-md typescript file that demonstrates a specific feature or use case. This will serve as a comprehensive set of examples for users to reference when using the tool. The examples should cover a wide range of scenarios, including basic usage, advanced features, and edge cases. Each example should be well-documented and include explanations of the code and expected output. Each folder should also have the generated markdown file for reference. 

 
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


## CLI

- [ ] allow for multiple input files for the cli. files would be output in the same folder with a .md extension.
- [ ] allow for --outputDir option to specify the output directory for the generated markdown files. This allows users to keep their generated documentation organized and separate from their source code. The cli would create the output directory if it does not exist, and would place the generated markdown files in that directory. If not specified, the generated markdown files would be placed in the same directory as the input files.
- [ ] support `--dryrun` option to the cli that will run the type checking and tests, but will not generate the MD file. This allows users to verify that their code is correct and that their tests pass before generating the documentation. The process would exit with a success or failure code depending on the results of the type checking and tests. Works in consort with --test and --typecheck if they were already implemented.
- [ ] add `--typecheck` option to cli that will run the type checking using typescript engine. Saves the user the hassle of making a new project file, or passing lots of parameters. It would run before the MD generation. Failure of type checking would prevent the MD generation, and the error messages would be printed to the console.
- [ ] add `--test` option to cli that will run the tests using node test runner. Saves the user the hassle of making a new project file, or passing lots of parameters. It would run before the MD generation. Failure prevents the MD generation, and the error is printed to the console.
- [ ] add a `--wait` to cli that will keep the process alive after generating the MD file. This allows users to inspect the generated file before the process exits, and also allows for easier debugging of the generation process. The process would exit when the user presses a key or sends a signal (e.g., Ctrl+C). WOrks in consort with --test and --typecheck if they were already implemented.
