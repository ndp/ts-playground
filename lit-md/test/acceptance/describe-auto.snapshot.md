# Describe with Auto Headers

When using `--describe=auto`, describe() block names are rendered as headers
that adapt to the document structure. If no headers exist yet, the first
describe starts at h1. If headers exist, describes start one level deeper
than the last header in the document. Nested describes go one level deeper
than their parent.
## Auto with no prior headers



```ts
1 + 1 // => 2

2 * 3 // => 6
```

## Auto after h1 (should start at h2)

# First Header



```ts
5 - 2 // => 3
```

## Auto after h2 (should start at h3)

## Second Header



```ts
10 / 2 // => 5
```

## Nested describes with auto





```ts
3 + 4 // => 7
```



```ts
8 - 3 // => 5
```

## Deeply nested with auto







```ts
typeof 'test' // => 'string'
```

## Auto after h3 (should start at h4)

### Third Header



```ts
7 * 2 // => 14
```
