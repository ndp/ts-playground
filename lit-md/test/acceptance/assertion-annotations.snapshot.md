# Assertion Annotations

Assertions inside `example()` bodies are rewritten as inline annotations,
turning passing tests into self-documenting code examples.
## assert.equal → `// => value`

```ts
example('example name', () => {
  const len = 'hello'.length
  assert.equal(len, 5)
})
```

becomes

````md
```ts
const len = 'hello'.length
len // => 5
```
````

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

## assert.ok — Nested in Expression

When `assert.ok(expr)` appears inside another expression (not at statement
level), it is rewritten to `expr // OK`.

```ts
const xs = [1, 2, 3]
(xs.length > 0 // OK, xs[0]) // => 1
```

## assert.strictEqual → `// => value`

`assert.strictEqual` uses the same annotation style as `assert.equal`.

```ts
const count = [1, 2, 3].length
count // => 3
```

## Multiple Assertions

Each assertion in a body is independently annotated inline.

```ts
const s = 'hello'
s.length // => 5
s.toUpperCase() // => 'HELLO'
s[0] // => 'h'
```
