# describe() Transparency

`describe()` wrappers are completely transparent in generated output.
The describe name is discarded; only the examples and comments inside appear.
## Basic Transparency

The word "Math" never appears in the output — only the example body does.

```typescript add
const sum = 1 + 1
sum // => 2
```

## Prose Inside describe()

Comments between examples inside `describe()` become interleaved prose blocks.
Convert a string to upper case:

```typescript toUpperCase
const result = 'hello'.toUpperCase()
result // => 'HELLO'
```

And back to lower:

```typescript toLowerCase
const result = 'WORLD'.toLowerCase()
result // => 'world'
```

## Nested describe()

Deeply nested `describe()` wrappers are also transparent.

```typescript deep
const x = 6 * 7
x // => 42
```
