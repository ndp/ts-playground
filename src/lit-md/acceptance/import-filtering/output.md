# Import Filtering

Import lines are hidden from the generated markdown by default.
Add `// keep` at the end of an import to include it in the output.
## Imports Hidden by Default

The two imports above (`example` and `assert`) do not appear in the output.
Only the example body is shown.

```typescript hidden imports
const x = 1
x // => 1
```

## Keeping an Import

Mark a specific import with `// keep` to include it.
This is useful when the import is part of the documentation story.

```typescript usage.ts
import { parse } from '../../parser.ts' // keep
```

```typescript parse usage
const nodes = parse('// hello')
nodes.length // => 1
```

## Keeping Multiple Imports

Any number of imports can be marked `// keep`.

```typescript
import { render } from '../../renderer.ts' // keep
import type { DocNode } from '../../parser.ts' // keep
```

```typescript parse and render
const src = '// # Title'
const nodes = parse(src)
const md = render(nodes)
md // => '# Title'
```
