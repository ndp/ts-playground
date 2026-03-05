## Support for demonstrating command line usage

## Engine
shellCommand returnCode assertions

 
## Markdown output

`describe` are by default omitted from md output. Alternatively, they can be converted to headers in the markdown output. User must specify the format: "##" means top leavel describe is marked by "##", and therefore nested describes would be marked by "###", and so on. This allows users to structure their documentation in a way that reflects the hierarchy of their tests and examples, making it easier to navigate and understand the generated markdown.  You could also specify "=" for "=====" underlines (and deeper ones would be be '-------'). If you specify '----', no nesting is supported... all describes will be '------', and therefore h2s.  This is passed in on the command line as --describe-format "#" or --describe-format "##"  or --describe-format "###" or --describe-format "=====" or --describe-format "----" (or whatever the user wants to use for headers). If the user doesn't specify a format, the default behavior is to omit describes from the markdown output.


Allow "// keep" to end any non-comment line with "// keep" to indicate that the line should be included in the generated markdown output, even if it would normally be omitted. 


### Omit some comments from output
Suggestion of //-  or /*-  to indicate that a comment should be omitted from the generated markdown output. This allows users to include comments in their code for clarity and documentation purposes without cluttering the generated documentation. The cli would simply ignore any comments that start with //- or /*- when generating the markdown output.


## Acceptance tests



## CLI

- [ ] add a `--wait` to cli that will keep the process alive after generating the MD file. This allows users to inspect the generated file before the process exits, and also allows for easier debugging of the generation process. The process would exit when the user presses a key or sends a signal (e.g., Ctrl+C). WOrks in consort with --test and --typecheck if they were already implemented.


## PUBLISHING

Publishing-prep checklist (not yet implemented)

5. Add build script — e.g. tsc -p tsconfig.build.json or esbuild for the CLI
6. Change "bin" — "./src/cli.ts" → "./dist/cli.js" (compiled JS)
8. Add metadata — keywords, repository, homepage fields
9. Consider a prepare script — runs build on npm install for consumers
