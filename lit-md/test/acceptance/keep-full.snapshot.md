## Keeping Full Statements

The `// keep` directive includes statements in the output.
For multi-line statements like functions and classes, use `// keep:full` to include the entire body.

### Single-Line Keep

With input file `input.md`:
```markdown

  const CONFIG = {timeout: 5000} // keep

  example('use config', () => {
    const delay = CONFIG.timeout
    assert.equal(delay, 5000)
  })

```

````sh
$ lit-md input.md
```ts
const CONFIG = {timeout: 5000}

const delay = CONFIG.timeout
delay // => 5000
```
````

### Single-Line Keep old

Single-line statements use `// keep`:
````ts
const CONFIG = { timeout: 5000 } // keep
const delay = CONFIG.timeout
delay // => 5000
describe('Multi-Line Keep with
    // For functions and classes, use `
    // ```
    // function createCounter() {
    //   let count = 0
    //   return {
    //     increment() { count++ },
    //     get: () => count
    //   }
    // }
    // ```

    function createCounter() {
      let count = 0
      return {
        increment() {
          count++
        },
        get: () => count
      }
    }

    example('counter example', () => {
      const counter = createCounter()
      counter.increment()
      assert.equal(counter.get(), 1)
    })
  })
describe('Classes with
    // ```
    // class Logger {
    //   private messages: string[] = []
    //
    //   log(msg: string) {
    //     this.messages.push(msg)
    //   }
    //
    //   getMessages() {
    //     return this.messages
    //   }
    // }
    // ```
    class Logger {
      private messages: string[] = []

      log(msg: string) {
        this.messages.push(msg)
      }

      getMessages() {
        return this.messages
      }
    }

    metaExample('logger example', () => {
      const logger = new Logger()
      logger.log('hello')
      const msgs = logger.getMessages()
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0], 'hello')
    })
  })
````
