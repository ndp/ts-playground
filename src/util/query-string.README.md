# Query-string utilities

## `buildQueryString`

Builds a deterministic query string by sorting parameter names alphabetically and URL-encoding both names and values.

```ts
buildQueryString({q: 'hello world', active: true})
// active&q=hello%20world
```

A value of `true` is emitted as a flag without an `=` or value. Other supported values are strings.
