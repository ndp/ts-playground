"use strict";
/*
# @ndp-software/lit-md

Write your documentation as a TypeScript (or JavaScript) test file.
`lit-md` generates the markdown — after your tests have verified
that every example actually works.

```sh
node --test README.ts   # run examples as tests
tsc README.ts           # typecheck
lit-md README.ts        # generate README.md
```
*/
exports.__esModule = true;
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var index_ts_1 = require("./index.ts");
/*
## How it works

A literate file is a normal `node:test` file. The rules are simple:

| Source construct                                | Output                        |
|-------------------------------------------------|-------------------------------|
| `//` or block comments                          | Markdown prose                |
| `import …`                                      | Hidden by default             |
| `import … // keep`                              | Shown as a code block         |
| `describe(name, fn)`                            | Transparent — name dropped, body kept |
| `test(name, fn)`                                | Body → fenced code block      |
| Comment ending with a code fence, then `test()` | Merged into one block         |
| `// file: name.ts` before a block               | Filename label on that fence  |
*/
(0, node_test_1.describe)('transformation rules', function () {
    // ### Comments become prose
    //
    // `//` line comments and `/* block */` comments both become markdown.
    // Blank `//` lines become paragraph breaks.
    (0, node_test_1.test)('line comments → prose', function () {
        var nodes = (0, index_ts_1.parse)('// Hello, **world**.\n//\n// Second paragraph.');
        strict_1["default"].deepEqual(nodes, [
            { kind: 'prose', text: 'Hello, **world**.\n\nSecond paragraph.' }
        ]);
    });
    (0, node_test_1.test)('block comments → prose (strips leading asterisks)', function () {
        var nodes = (0, index_ts_1.parse)('/*\n * ## Section\n *\n * A description.\n */');
        strict_1["default"].deepEqual(nodes, [
            { kind: 'prose', text: '## Section\n\nA description.' }
        ]);
    });
    // ### test() bodies become code blocks
    //
    // The body of each `test()` call becomes a fenced code block.
    // The test name is stored as a fence `title` — rendered as a tab label
    // in Docusaurus, silently ignored by GitHub.
    (0, node_test_1.test)('test body → fenced code block', function () {
        var src = "\nimport { test } from 'node:test'\ntest('greet', () => {\n  const msg = 'Hello, world!'\n  assert.equal(msg.length, 13)\n})\n";
        var nodes = (0, index_ts_1.parse)(src);
        strict_1["default"].deepEqual(nodes, [
            { kind: 'code', lang: 'typescript', text: "const msg = 'Hello, world!'\nassert.equal(msg.length, 13)", title: 'greet' }
        ]);
    });
    // ### describe() is transparent
    //
    // `describe()` wrappers are stripped entirely. The name is discarded and
    // the body is kept. Use `describe` to group related tests without affecting
    // the generated docs.
    (0, node_test_1.test)('describe is transparent — name is discarded', function () {
        var src = "\nimport { describe, test } from 'node:test'\ndescribe('My Group', () => {\n  test('inner', () => { const x = 1 })\n})\n";
        var nodes = (0, index_ts_1.parse)(src);
        // Verify 'My Group' does not appear anywhere in the output
        strict_1["default"].ok(!JSON.stringify(nodes).includes('My Group'));
    });
    // ### Import filtering
    //
    // All `import` lines are hidden by default — test infrastructure imports
    // would clutter the docs. Add `// keep` to show an import:
    //
    // ```typescript
    // import { greet } from './greet.ts' // keep   ← shown
    // import { test } from 'node:test'             ← hidden
    // ```
    (0, node_test_1.test)('imports are hidden by default', function () {
        var nodes = (0, index_ts_1.parse)("import { test } from 'node:test'");
        strict_1["default"].deepEqual(nodes, []);
    });
    (0, node_test_1.test)('// keep shows the import in a code block', function () {
        var nodes = (0, index_ts_1.parse)("import { greet } from './greet.ts' // keep");
        strict_1["default"].equal(nodes.length, 1);
        strict_1["default"].equal(nodes[0].kind, 'code');
        strict_1["default"].ok(nodes[0].text.includes("import { greet }"));
    });
});
// ## Merging imports into examples
//
// If a comment section ends with a fenced code block **and** a `test()` follows
// immediately, the fence and the test body merge into one code block.
// This lets you show the import alongside the usage without a separate block.
//
// The comment below ends with a fence, so it merges with the next test:
//
// ```typescript
// import { parse } from '@ndp-software/lit-md'
// ```
(0, node_test_1.describe)('code merge', function () {
    (0, node_test_1.test)('merged block includes both the fence and the test body', function () {
        var src = "\nimport { test } from 'node:test'\n// Use it like this:\n//\n// ```typescript\n// import { parse } from '@ndp-software/lit-md'\n// ```\ntest('example', () => {\n  const nodes = parse('// Hello')\n  assert.equal(nodes[0]?.kind, 'prose')\n})\n";
        var nodes = (0, index_ts_1.parse)(src);
        var code = nodes.find(function (n) { return n.kind === 'code'; });
        strict_1["default"].ok(code.text.includes("import { parse }"));
        strict_1["default"].ok(code.text.includes("const nodes = parse"));
    });
});
// ## Filename labels
//
// Place `// file: name.ts` on the line immediately before a `test()` or a
// kept import to add a filename label to that code block.
(0, node_test_1.describe)('filename labels', function () {
    // file: greet-usage.ts
    (0, node_test_1.test)('// file: sets the fence label', function () {
        var src = "\nimport { test } from 'node:test'\n// file: greet-usage.ts\ntest('labeled', () => {\n  const msg = greet('world')\n})\n";
        var nodes = (0, index_ts_1.parse)(src);
        var code = nodes.find(function (n) { return n.kind === 'code'; });
        strict_1["default"].equal(code === null || code === void 0 ? void 0 : code.title, 'greet-usage.ts');
    });
});
// ## The document model
//
// `parse()` returns an array of `DocNode` objects. `render()` converts them
// to a markdown string. You can use these directly if you need custom output.
(0, node_test_1.describe)('document model', function () {
    (0, node_test_1.test)('render converts DocNode[] to a markdown string', function () {
        var md = (0, index_ts_1.render)([
            { kind: 'prose', text: '## Example' },
            { kind: 'code', lang: 'typescript', text: 'const x = 1', title: undefined }
        ]);
        strict_1["default"].equal(md, '## Example\n\n```typescript\nconst x = 1\n```');
    });
});
// ## CLI
//
// ```sh
// # Write README.md next to README.ts
// lit-md README.ts
//
// # Write to a custom path
// lit-md README.ts --out docs/index.md
// ```
//
// The generated file ends with a trailing newline. The input file is never
// modified — `lit-md` is read-only with respect to your source.
