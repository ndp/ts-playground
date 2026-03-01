## Support for demonstrating command line usage

- [ ] Add support for demonstrating command line usage in the documentation. This could include examples of how to use the command line interface (CLI) for various tools and applications, as well as explanations of common command line options and arguments.
- [ ] The built-in README.ts/md can be used as a good starting point. The main usage of this tool will be the command line, but the readme does not mention it. It would be helpful to include a section in the README that explains how to use the command line interface, including examples of common commands and options.

## A way to re-write test assertions in the markdown file.

Reason: It could be really confusing to see lots of test assertions in the documentation. 

Idea: rewrite lines like `assert.equal(<result>, <expected>)` to something like `<result> // -> should equal <expected>`. This would make the documentation more readable and easier to understand for non-technical readers.
