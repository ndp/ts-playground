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
example('deepEqual single-line', () => {
  const nums = [1, 2, 3]
  assert.deepEqual(nums, [1, 2, 3])
})
```
becomes
````md
```ts
const nums = [1, 2, 3]
nums // => [1, 2, 3]
```
````

## assert.deepEqual — Multi-Line

When the expected value spans multiple lines, the annotation wraps
across comment lines following the variable.

```ts
example('deepEqual multi-line', () => {
  const point = { x: 1, y: 2 }
  assert.deepEqual(point, {
    x: 1,
    y: 2
  })
})
```
becomes
````md
```ts
const point = { x: 1, y: 2 }
point // => {
//   x: 1,
//   y: 2
// }
```
````

## assert.notEqual → `// != value`

```ts
example('notEqual', () => {
  const value = getValue()
  assert.notEqual(value, null)
})
```
becomes
````md
```ts
const value = getValue()
value // != null
```
````

## assert.throws — With Pattern

```ts
example('throws with pattern', () => {
  assert.throws(() => divide(1, 0), /division by zero/)
})
```
becomes
````md
```ts
divide(1, 0) // throws /division by zero/
```
````

## assert.throws — No Pattern

```ts
example('throws no pattern', () => {
  assert.throws(() => divide(1, 0))
})
```
becomes
````md
```ts
divide(1, 0) // throws
```
````

## assert.ok — Dropped at Statement Level

`assert.ok(expr)` as a standalone statement is silently removed from output.
It still runs and guards correctness, but doesn't clutter the docs.

```ts
example('ok dropped', () => {
  const items = [1, 2, 3]
  assert.ok(items.length > 0)
})
```
becomes
````md
```ts
const items = [1, 2, 3]
```
````

## assert.strictEqual → `// => value`

`assert.strictEqual` uses the same annotation style as `assert.equal`.

```ts
example('strictEqual', () => {
  const count = [1, 2, 3].length
  assert.strictEqual(count, 3)
})
```
becomes
````md
```ts
const count = [1, 2, 3].length
count // => 3
```
````

## Multiple Assertions

Each assertion in a body is independently annotated inline.

```ts
example('multiple', () => {
  const s = 'hello'
  assert.equal(s.length, 5)
  assert.equal(s.toUpperCase(), 'HELLO')
  assert.equal(s[0], 'h')
})
```
becomes
````md
```ts
const s = 'hello'
s.length // => 5
s.toUpperCase() // => 'HELLO'
s[0] // => 'h'
```
````
