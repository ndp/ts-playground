# Encoder

A TypeScript utility for base64 encoding strings.

```typescript
import { encode, decode } from './encoder.ts' // keep
```

## Basic Usage

Pass any string to `encode` and get a base64 result:

```typescript encode-example.ts
import { encode } from './encoder.ts'
const result = encode('hello')
assert.equal(result, 'aGVsbG8=')
```

You can also encode empty strings:

```typescript handles empty string
assert.equal(encode(''), '')
```

## Round-trip

`decode` reverses `encode`:

```typescript round-trips a string
assert.equal(decode(encode('world')), 'world')
```

## Illustrative

Chaining is possible but unusual:

```ts
const twice = encode(encode('hello'))
```
