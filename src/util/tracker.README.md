# Tracker

`Tracker<T>` maintains a set of items and associates cleanup functions with each item.

## Why use Tracker?

A plain `Set` tells you what exists. `Tracker` also remembers how to clean each item up when it is removed:

```ts
const connections = new Tracker<Connection>()

connections.onAdd(connection => {
  connection.start()
  return () => connection.stop()
})

connections.add(connection)
connections.remove(connection) // automatically stops the connection
```

This is useful for DOM listeners, WebSocket connections, timers, subscriptions, temporary resources, and component/plugin instances. With `setAll()`, it also makes collection synchronization easy:

```ts
tracker.onAdd(userId => subscribeToUser(userId))
tracker.setAll(visibleUserIds)
```

Items that are no longer visible are unsubscribed automatically, while new items are subscribed. Use a plain `Set` when items have no cleanup lifecycle; use an event emitter or observable when you need a richer event stream.

## Usage

```ts
const tracker = new Tracker<string>()
const stopListening = tracker.onAdd(item => () => disconnect(item))

tracker.add('connection')
tracker.remove('connection') // runs its cleanup
stopListening()
```

Add listeners may return synchronous or asynchronous cleanup functions. Use `flushPendingAsyncResults()` to await asynchronous add-listener failures. `setAll()` removes obsolete items before adding new ones.

## Tracking multiple items

```ts
const tracker = new Tracker<number>([1])

const added = tracker.add([1, 2, 3])
// added: [2, 3]

tracker.setAll([2, 4])
// removes 1 and 3, then adds 4
```

## Multiple cleanups

```ts
const tracker = new Tracker<string>()
tracker.add('socket')

tracker.track('socket', () => socket.close())
tracker.track('socket', () => removeEventListeners())

tracker.remove('socket') // runs both cleanups
```

## Asynchronous listeners

```ts
const tracker = new Tracker<string>()
tracker.onAdd(async item => {
  const resource = await connect(item)
  return () => resource.close()
})

tracker.add('database')
const errors = await tracker.flushPendingAsyncResults()
```
