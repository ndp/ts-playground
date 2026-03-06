import { example, metaExample, describe } from '../../src/index.ts'
import assert from 'node:assert/strict'

describe('Keeping Full Statements', () => {
  // The `// keep` directive includes statements in the output.
  // For multi-line statements like functions and classes, use `// keep:full` to include the entire body.

  describe('Single-Line Keep', () => {
    // Single-line statements use `// keep`:
    // ```
    // const CONFIG = { timeout: 5000 } // keep
    // ```
    const CONFIG = { timeout: 5000 }

    example('use config', () => {
      const delay = CONFIG.timeout
      assert.equal(delay, 5000)
    })
  })

  describe('Multi-Line Keep with // keep:full', () => {
    // For functions and classes, use `// keep:full` to preserve the entire definition:
    // ```
    // function createCounter() { // keep:full
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
        increment() { count++ },
        get: () => count
      }
    }

    example('counter example', () => {
      const counter = createCounter()
      counter.increment()
      assert.equal(counter.get(), 1)
    })
  })

  describe('Classes with // keep:full', () => {
    // ```
    // class Logger { // keep:full
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
})
