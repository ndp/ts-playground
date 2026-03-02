# Code Fence Merging

When a comment block ends with a closing code fence (`

```typescript parse usage
the following `example()` is merged into that fence as one code block.
This lets you show an import alongside its live-tested usage.
## Basic Merge

Show an import in the comment fence; the example body continues it.

```typescript
import { parse } from '@ndp-software/lit-md'
const nodes = parse('// hello')
nodes.length // => 1
```

## Import + Assertion in One Block

The merge produces a single cohesive block: import, usage, and annotation.

```typescript render usage
import { render } from '@ndp-software/lit-md'
const md = render([{ kind: 'prose', text: '# Hello' }])
md // => '# Hello'
```

## No Merge Without Trailing Fence

A comment that does NOT end with a fence produces separate prose and code blocks.

```typescript separate block
const x = 1 + 1
x // => 2
```
