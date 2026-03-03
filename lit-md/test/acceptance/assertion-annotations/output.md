# Assertion Annotations

Assertions inside `example()` bodies are rewritten as inline annotations,
turning passing tests into self-documenting code examples.
## assert.equal → `// => value`

```ts
const len = 'hello'.length
len // => 5
```

## assert.deepEqual — Single Line

When the expected value fits on one line, it appears inline.

```ts
const nums = [1, 2, 3]
nums // => [1, 2, 3]
```

## assert.deepEqual — Multi-Line

When the expected value spans multiple lines, the annotation wraps
across comment lines following the variable.

```ts
const point = { x: 1, y: 2 }
point // => {
//   x: 1,
//   y: 2
// }
```

## assert.notEqual → `// != value`

```ts
const value = getValue()
value // != null
```

## assert.throws — With Pattern

```ts
divide(1, 0) // throws /division by zero/
```

## assert.throws — No Pattern

```ts
divide(1, 0) // throws
```

## assert.ok — Dropped at Statement Level

`assert.ok(expr)` as a standalone statement is silently removed from output.
It still runs and guards correctness, but doesn't clutter the docs.

```ts
const items = [1, 2, 3]
```
