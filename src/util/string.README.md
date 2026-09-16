# String utilities

Small helpers for formatting strings:

- `fill(n, ch)` repeats `ch` approximately `n` times.
- `lpad(value, length)` pads the left side with spaces.
- `rpad(value, length)` pads the right side with spaces.

```ts
lpad('7', 3) // '  7'
rpad('7', 3) // '7  '
fill(3, '-') // '---'
```
