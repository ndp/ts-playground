import assert from 'node:assert/strict'
import {it as spec, describe, mock} from 'node:test'

import {
  inMemoryLens,
  observeableLens,
  transformLens,
  readOnlyLens,
  withFallbackLens,
  propLens,
  cookieLens, Lens
} from './lens'


describe('withFallbackLens', () => {
  spec('uses a base value', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens('bar')
    const lens = withFallbackLens(o, b)

    assert.equal(lens.value, 'bar')
  })
  spec('uses an override value', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined)
    const lens = withFallbackLens(o, b)

    assert.equal(lens.value, 'foo')
  })
  spec('updates just the base', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined as unknown as string)
    const lens = withFallbackLens(o.readOnly, b)

    lens.set('bar')

    assert.equal(b.value, 'bar')
    assert.equal(o.value, undefined)

    assert.equal(lens.value, 'bar')
  })
  spec('updates just the override', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined as unknown as string)
    const lens = withFallbackLens(o, b.readOnly)

    lens.set('bar')

    assert.equal(lens.value, 'bar')
    assert.equal(b.value, 'foo')
    assert.equal(o.value, 'bar')
  })
  spec('updates both lenses', () => {
    const b = inMemoryLens<string>('foo')
    const o = inMemoryLens(undefined as unknown as string)
    const lens = withFallbackLens(o, b)

    lens.set('bar')

    assert.equal(lens.value, 'bar')
    assert.equal(b.value, 'bar')
    assert.equal(o.value, 'bar')
  })
})


describe('inMemoryLens', () => {
  spec('can store numbers', () => {
    assert.equal(inMemoryLens(1).value, 1)
    assert.equal(inMemoryLens(2).value, 2)
  })
  spec('can store objects', () => {
    assert.deepEqual(inMemoryLens({one: 1, two: [1, 2, 3], 3: 'tree'}).value, {one: 1, two: [1, 2, 3], 3: 'tree'})
  })
  spec('can change values', () => {
    const a = inMemoryLens('foo')
    assert.equal(a.value, 'foo')
    a.set('bar')
    assert.equal(a.value, 'bar')
    a.set('baz')
    assert.equal(a.value, 'baz')
  })
})

describe('observeableLens', () => {
  spec('can observe a change', async () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()

    myLens.addObserver(onChangeSpy, {observeInitialValue: true})

    await new Promise(r => setTimeout(r, 5))

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myLens.value, 'foo')
  })

  spec('can observe initial value', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()

    myLens.addObserver(onChangeSpy)
    myLens.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myLens.value, 'bar')
  })
  spec('can remove an observer', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()

    const remover = myLens.addObserver(onChangeSpy)
    remover()

    myLens.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 0)
  })
  spec('can observe multiple changes', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy = mock.fn()
    myLens.addObserver(onChangeSpy)

    myLens.set('bar')
    myLens.set('baz')
    myLens.set('buzz')

    assert.equal(onChangeSpy.mock.calls.length, 3)
  })
  spec('multiple observers', () => {
    const myLens = observeableLens(inMemoryLens<string>('foo'))

    const onChangeSpy1 = mock.fn()
    const onChangeSpy2 = mock.fn()

    myLens.addObserver(onChangeSpy1)
    myLens.addObserver(onChangeSpy2)

    myLens.set('bar')

    assert.equal(onChangeSpy1.mock.calls.length, 1)
    assert.equal(onChangeSpy2.mock.calls.length, 1)
  })
})


describe('observable', () => {
  spec('can observe a change', async () => {
    const myLens = inMemoryLens<string>('foo').observable

    const onChangeSpy = mock.fn()

    myLens.addObserver(onChangeSpy, {observeInitialValue: true})

    await new Promise(r => setTimeout(r, 5))

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myLens.value, 'foo')
  })

  spec('can observe initial value', () => {
    const myLens = inMemoryLens<string>('foo').observable

    const onChangeSpy = mock.fn()

    myLens.addObserver(onChangeSpy)
    myLens.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myLens.value, 'bar')
  })
  spec('can remove an observer', () => {
    const myLens = inMemoryLens<string>('foo').observable

    const onChangeSpy = mock.fn()

    const remover = myLens.addObserver(onChangeSpy)
    remover()

    myLens.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 0)
  })
  spec('can observe multiple changes', () => {
    const myLens = inMemoryLens<string>('foo').observable

    const onChangeSpy = mock.fn()
    myLens.addObserver(onChangeSpy)

    myLens.set('bar')
    myLens.set('baz')
    myLens.set('buzz')

    assert.equal(onChangeSpy.mock.calls.length, 3)
  })
  spec('multiple observers', () => {
    const myLens = inMemoryLens<string>('foo').observable

    const onChangeSpy1 = mock.fn()
    const onChangeSpy2 = mock.fn()

    myLens.addObserver(onChangeSpy1)
    myLens.addObserver(onChangeSpy2)

    myLens.set('bar')

    assert.equal(onChangeSpy1.mock.calls.length, 1)
    assert.equal(onChangeSpy2.mock.calls.length, 1)
  })
})

describe('transformLens', () => {
  spec('can convert from String to Int', () => {
    const lens1 = inMemoryLens('a')
    const lens2 = transformLens(lens1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    assert.equal(lens2.value, 10)
    assert.equal(lens1.value, 'a')
  })
  spec('can change outer lens', () => {
    const lens1 = inMemoryLens('a')
    const lens2 = transformLens(lens1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    lens2.set(15)
    assert.equal(lens2.value, 15)
    assert.equal(lens1.value, 'f')

    lens2.set(1965)
    assert.equal(lens2.value, 1965)
    assert.equal(lens1.value, '7ad')
  })
  spec('can change inner lens', () => {
    const lens1 = inMemoryLens('a')
    const lens2 = transformLens(lens1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    lens1.set('f')
    assert.equal(lens2.value, 15)
    assert.equal(lens1.value, 'f')

    lens1.set('7ad')
    assert.equal(lens2.value, 1965)
    assert.equal(lens1.value, '7ad')
  })
})


describe('readOnlyLens', () => {
  spec('prevents modification to underlying lens', () => {
    const lens1 = inMemoryLens(7)
    const wrap = readOnlyLens(lens1)

    assert.equal(wrap.value, 7)

    wrap.set(3)

    assert.equal(wrap.value, 7)
  })
})

describe('readOnly', () => {
  spec('prevents modification to underlying lens', () => {
    const lens1 = inMemoryLens(7)
    const wrap = lens1.readOnly

    assert.equal(wrap.value, 7)

    wrap.set(3)

    assert.equal(wrap.value, 7)
  })
})


describe('cookieLens', () => {

  let mockDoc: Partial<Document>

  spec('should return the default value if no cookie is set', () => {
    const lens = cookieLens('testCookie', 'defaultValue');
    lens.setDocument({
      cookie: ''
    });

    assert.equal(lens.value, 'defaultValue');
  });

  spec('should return the cookie value if it is set', () => {
    const lens = cookieLens('testCookie', 'defaultValue');
    lens.setDocument({
      cookie: 'testCookie=cookieValue'
    });
    assert.equal(lens.value, 'cookieValue');
  });

  spec('should set the cookie value', () => {
    const lens = cookieLens('testCookie', 'defaultValue');
    mockDoc = {
      cookie: ''
    }
    lens.setDocument(mockDoc);
    lens.set('newValue');
    assert(mockDoc.cookie!.includes('testCookie=newValue'));
  });

  spec('should update the cookie value', () => {

    const lens = cookieLens('testCookie', 'defaultValue');
    mockDoc = {
      cookie: 'testCookie=oldValue'
    }
    lens.setDocument(mockDoc);
    lens.set('newValue');
    assert(mockDoc.cookie!.includes('testCookie=newValue'))
  });

  spec('should handle multiple cookies', () => {
    const lens1 = cookieLens('cookie1', 'default1');
    const lens2 = cookieLens('cookie2', 'default2');
    mockDoc = {
      cookie: 'cookie1=value1; cookie2=value2'
    }
    lens1.setDocument(mockDoc);
    lens2.setDocument(mockDoc);

    assert.equal(lens1.value, 'value1');
    assert.equal(lens2.value, 'value2');
  });
});
//
// function pLens0<
//   L extends Lens<unknown>,
//   S = L extends Lens<infer U> ? U : never,
//   T = keyof S
// >(prop: T): (lens: L) => Lens<S[T]> {
//   return (lens: L) => propLens<L, T, S>(lens, prop)
// }
type ObjectWithProperty<P extends PropertyKey, V> = {
  [K in P]: V;
};
//
// function pLens<
//   V,
//   P extends string = string,
//   Outer = ObjectWithProperty<P, V>
// >(prop: P) {
//   return (lens: Lens<Outer>) => (propLens(lens, prop) as Lens<V>)
// }
//
// // maybe propLens needs to go the other way: it infers the lens type from the property given
//
// describe('pLens', () => {
//   spec('', () => {
//     const obj = {a: 1, b: 2};
//     const lens = inMemoryLens(obj)
//     const unbound = pLens<number>('a')
//
//     assert.equal(unbound(lens).value, 1)
//     assert.equal(unbound({a: 7}).value, 7)
//
//   })
// })

class ObjectPropLens<
  Target extends Record<P, V>,
  P extends keyof Target = keyof Target,
  V = Target[P]//Target extends Record<K, infer k> ? k : never
> extends Lens<V> {

  constructor(private readonly prop: P,
              private readonly target: Target) {
    super()
  }

  get value(): V {
    return this.target[this.prop]
  }

  set(val: V) {
    (this.target as { [k in P]: V })[this.prop] = val
  }
}

function objPropLens<
  Target extends Record<P, unknown>,
  P extends keyof Target = keyof Target
>(prop: P): (target: Target) => Lens<Target[P]> {
  return (target: Target) =>
    new ObjectPropLens<Target, P>(prop, target)
}

describe('objPropLens', () => {
  spec('basic get and set', () => {

    const target = {
      foo: 1,
      bar: {
        buzz: [10, 11, 12]
      }
    }

    const fooLens = objPropLens<{ foo: number }>('foo')
    assert.equal(fooLens(target).value, 1)

    fooLens(target).set(2)

    assert.equal(target.foo, 2)
  })

  spec('nesting', () => {

    const target = {
      foo: 1,
      bar: {
        buzz: [10, 11, 12],
        baz: 'aha'
      }
    }
    //
    // const barLens = objPropLens<typeof target>('bar')
    // const bazLens = objPropLens<typeof barLens>(barLens, 'baz')


  })

  spec('works with arrays', () => {
    const ar = [10,11,12]

    const secondLens = objPropLens<Array<number>>(1)

    const val = secondLens(ar).value

    assert.equal(val, 11)
  })
})


describe('propLens', () => {
  spec('gets the value of the specified property', () => {
    const obj = {a: 1, b: 2};
    const lens = inMemoryLens(obj);
    const propLensA = propLens(lens, 'a');

    assert.equal(propLensA.value, 1);
  });

  spec('sets the value of the specified property', () => {
    const obj = {a: 1, b: 2};
    const lens = inMemoryLens(obj);
    const propLensA = propLens(lens, 'a');

    propLensA.set(10);
    assert.equal(propLensA.value, 10);
    assert.equal(lens.value.a, 10);
  });

  spec('works on arrays', () => {
    const obj = ['a', 'b', 'c'];
    const alens = inMemoryLens(obj);
    const lens = propLens(alens, 1);
    assert.equal(lens.value, 'b');

    lens.set('d');
    assert.equal(lens.value, 'd');
    assert.deepEqual(obj, ['a', 'b', 'c']) // immutable
    assert.notEqual(alens.value, obj); // new reference
    assert.deepEqual(alens.value, ['a', 'd', 'c']);
  });

  spec('should not affect other properties', () => {
    const obj = {a: 1, b: 2};
    const lens = inMemoryLens(obj);
    const propLensA = propLens(lens, 'a');

    propLensA.set(10);
    assert.equal(lens.value.b, 2);
  });

  spec('should work with nested objects', () => {
    const obj = {a: {x: 1, y: 2}, b: 2};
    const lens = inMemoryLens(obj);
    const propLensA = propLens(lens, 'a');
    const nestedPropLensX = propLens(propLensA, 'x');

    nestedPropLensX.set(10);
    assert.equal(nestedPropLensX.value, 10);
    assert.equal(lens.value.a.x, 10);
  });
});