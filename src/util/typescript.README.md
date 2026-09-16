# TypeScript utilities

This module contains reusable type-level helpers and runtime type guards.

## Type helpers

Includes equality and assertion helpers (`Equal`, `Expect`, `NotEqual`), type detection (`IsAny`, `IsUnknown`), object shaping (`Prettify`, `MergeInsertions`), and advanced transformations such as `UnionToIntersection`.

## Runtime helper

`isIterableNonString(value)` checks whether a value is iterable while excluding primitive strings.

```ts
if (isIterableNonString(value)) {
  for (const item of value) console.log(item)
}
```
