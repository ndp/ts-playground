# Keeping Full Statements

The `// keep` directive includes statements in the output.
For multi-line statements like functions and classes, use `// keep:full` to include the entire body.
## Single-Line Keep

Single-line statements use `// keep`:
```ts
const CONFIG = { timeout: 5000 } // keep
const delay = CONFIG.timeout
delay // => 5000
```

## Multi-Line Keep with // keep:full

For functions and classes, use `// keep:full` to preserve the entire definition:
```ts
function createCounter() { // keep:full
  let count = 0
  return {
    increment() { count++ },
    get: () => count
  }
}
const counter = createCounter()
counter.increment()
counter.get() // => 1
```

## Classes with // keep:full

```
class Logger { // keep:full
  private messages: string[] = []

  log(msg: string) {
    this.messages.push(msg)
  }

  getMessages() {
    return this.messages
  }
}
```

```ts
example('logger example', () => {
  const logger = new Logger()
  logger.log('hello')
  const msgs = logger.getMessages()
  assert.equal(msgs.length, 1)
  assert.equal(msgs[0], 'hello')
})
```
becomes
````md
```ts
const logger = new Logger()
logger.log('hello')
const msgs = logger.getMessages()
msgs.length // => 1
msgs[0] // => 'hello'
```
````
