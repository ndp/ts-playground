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

Update docs/README.md.test.ts to reflect new --describe option and its behavior.


Allow "// keep" to end ts code lines, eg. functions or variable declarations or import statements.

#### Part A: Single-Line Statements (COMPLETED ✅)
Variable declarations, type aliases, imports, and other single-line statements ending with `// keep` are now preserved in the output.

Examples:
- `const CONFIG = { x: 1 } // keep` ✓ Works
- `type Alias = string // keep` ✓ Works
- `import { foo } from 'bar' // keep` ✓ Works

#### Part B: Multi-Line Statements (Future - Choose One Approach Below)

Challenge: When a function, class, or other multi-line statement has `// keep`, decide what to extract:

##### Option A: Extract Only Signature Line
**What**: Extract only the first line of the declaration (e.g., `function foo() {`)

**Pros**:
- Simple to implement
- Predictable output
- Clear visual indication of code structure
- Non-intrusive in documentation

**Cons**:
- Incomplete code (opens brace not closed in output)
- Requires syntax highlighting awareness
- Less useful for understanding full declarations
- May look odd for inline class/function definitions

**Complexity**: 🟢 Low (1-2 hours)

**Implementation**: Extract from statement start to first `{` character, preserve what's before it.

---

##### Option B: Extract Full Statement with Body
**What**: Extract the entire statement, including full function/class body

**Pros**:
- Complete code examples
- Useful for showing helper functions or utilities
- User gets the full context
- No truncation ambiguity

**Cons**:
- Can be verbose for documentation
- Large code blocks in output
- May clutter the narrative flow
- Nested code inside body might be confusing without context

**Complexity**: 🟡 Medium (2-3 hours)

**Implementation**: Extract from statement start to statement end (using TypeScript AST `getEnd()`). Dedent according to body context.

---

##### Option C: Smart Truncation/Elision
**What**: Extract declaration with body represented as ellipsis or summary

**Pros**:
- Compact representation
- Shows structure without noise
- Best of both worlds
- Good for showing API signatures

**Cons**:
- Complex to implement correctly
- Edge cases around different statement types
- May be surprising to users
- Requires careful design of elision format

**Complexity**: 🔴 High (4-6 hours)

**Implementation**: 
1. Extract function/class signature
2. Show opening brace + ellipsis + closing brace
3. Example: `function getData(id) { ... }` or `class MyClass { /* implementation */ }`
4. Handle edge cases: arrow functions, async, inline bodies, etc.

---

##### Recommendation for Part B
**Option A** (Signature Only) is recommended as the first implementation:
- Lowest complexity
- Clear semantics
- Users can be explicit about what they want shown
- Can be enhanced later if needed

**Option B** could follow as a variant (perhaps with a flag `// keep:full` or `// keep-body`)

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
