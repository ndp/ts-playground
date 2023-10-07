// Services as classes
class TimeService {
  now() {
    return new Date()
  }
}

class FooService {
  get value() {
    return 'foo'
  }
}

// Must be instantiated at some point
const timeService = new TimeService()
const fooService = new FooService()

// A context is a service provider. Could front a service locator
const context = {timeService, fooService}
type Context = typeof context

// Write service consumer with services injected into "this"
function injectableBusinessStuff(this: Context, value: string) {
  console.log(this.timeService.now())

  return this.fooService.value + value
}

const result = injectableBusinessStuff.call(context, 'bar')
console.log(result)

// For use inside an application, can be bound for app lifecycle
const businessStuff = injectableBusinessStuff.bind(context)
console.log(businessStuff('baz'))
