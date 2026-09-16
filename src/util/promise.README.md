# Promise utilities

## `isPromise`

`isPromise(value)` detects promise-like values by checking 
for a callable `then` property. 
It also narrows the TypeScript type when used as a type guard.

```ts
const value: unknown = getValue()
if (isPromise(value)) {
  await value
}
```

This recognizes native promises and compatible thenables.
