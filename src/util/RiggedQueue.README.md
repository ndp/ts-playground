# RiggedQueue

A bounded queue with two priorities:

- **Winners** stay at the front and are never evicted.
- **Non-winners** are added near the front and evicted by least-recent usage when the queue exceeds `maxSize`.

## Usage

```ts
const queue = new RiggedQueue(3, ['pinned'], ['a', 'b'])
queue.add('c')
queue.use('a')

queue.peek() // ['pinned', 'c', 'a']
```

Use `onChange()` to observe additions and removals. The returned unsubscribe function removes the listener. `peek()` preserves its cached array identity; the returned snapshot is frozen and cannot be mutated.

## Prioritizing items

```ts
const queue = new RiggedQueue(4, ['always-show'], ['old-1', 'old-2'])

queue.add('recent')
queue.add('most-recent', 'next')

queue.peek()
// ['always-show', 'most-recent', 'next', 'recent']
```

## Usage affects eviction

```ts
const queue = new RiggedQueue(3, [], ['a', 'b', 'c'])
queue.use('a')
queue.add('d')

queue.peek()
// ['d', 'a', 'b'] — the least-recently-used item is evicted
```

## Observing changes

```ts
const queue = new RiggedQueue(2, [], ['a'])
const stop = queue.onChange(event => {
  console.log('added:', event.added)
  console.log('removed:', event.removed)
  console.log('current:', event.items)
})

queue.add('b')
stop()
```

## Winners exceeding the cap

Winners are retained even when their count exceeds `maxSize`; non-winners are then evicted first.

```ts
const queue = new RiggedQueue(1, ['a', 'b'], ['c'])
queue.peek() // ['a', 'b']
```
