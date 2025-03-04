import assert from 'node:assert/strict'
import {describe, it as spec, mock} from 'node:test'

import {
  cookieGrip,
  varGrip,
  manualGrip,
  objectPropGrip,
  observeableGrip,
  propGrip,
  readOnlyGrip,
  transformGrip,
  withFallbackGrip
} from './grip'

describe('manualGrip', () => {
  spec('can apply arbitrary getters and setters', () => {
    let val = 7
    const grip = manualGrip(
      () => val,
      (v: number) => val = v
    )

    assert.equal(grip.value, 7)

    grip.set(8)

    assert.equal(grip.value, 8)
    assert.equal(val, 8)
  })

  spec('can provide a context object', () => {
    const grip = manualGrip(
      (context) => context.val,
      (v: number, context) => context.val = v,
      {val: 7}
    )
    assert.equal(grip.value, 7)

    grip.set(8)
    assert.equal(grip.value, 8)
  })
})
describe('withFallbackGrip', () => {
  spec('uses a base value', () => {
    const b = varGrip<string>('foo')
    const o = varGrip('bar')
    const grip = withFallbackGrip(o, b)

    assert.equal(grip.value, 'bar')
  })
  spec('uses an override value', () => {
    const b = varGrip<string>('foo')
    const o = varGrip(undefined)
    const grip = withFallbackGrip(o, b)

    assert.equal(grip.value, 'foo')
  })
  spec('updates just the base', () => {
    const b = varGrip<string>('foo')
    const o = varGrip(undefined as unknown as string)
    const grip = withFallbackGrip(o.readOnly, b)

    grip.set('bar')

    assert.equal(b.value, 'bar')
    assert.equal(o.value, undefined)

    assert.equal(grip.value, 'bar')
  })
  spec('updates just the override', () => {
    const b = varGrip<string>('foo')
    const o = varGrip(undefined as unknown as string)
    const grip = withFallbackGrip(o, b.readOnly)

    grip.set('bar')

    assert.equal(grip.value, 'bar')
    assert.equal(b.value, 'foo')
    assert.equal(o.value, 'bar')
  })
  spec('updates both gripes', () => {
    const b = varGrip<string>('foo')
    const o = varGrip(undefined as unknown as string)
    const grip = withFallbackGrip(o, b)

    grip.set('bar')

    assert.equal(grip.value, 'bar')
    assert.equal(b.value, 'bar')
    assert.equal(o.value, 'bar')
  })
})


describe('inMemoryGrip', () => {
  spec('can store numbers', () => {
    assert.equal(varGrip(1).value, 1)
    assert.equal(varGrip(2).value, 2)
  })
  spec('can store objects', () => {
    assert.deepEqual(varGrip({one: 1, two: [1, 2, 3], 3: 'tree'}).value, {one: 1, two: [1, 2, 3], 3: 'tree'})
  })
  spec('can change values', () => {
    const a = varGrip('foo')
    assert.equal(a.value, 'foo')
    a.set('bar')
    assert.equal(a.value, 'bar')
    a.set('baz')
    assert.equal(a.value, 'baz')
  })
})

describe('observeableGrip', () => {
  spec('can observe a change', async () => {
    const myGrip = observeableGrip(varGrip<string>('foo'))

    const onChangeSpy = mock.fn()

    myGrip.addObserver(onChangeSpy, {observeInitialValue: true})

    await new Promise(r => setTimeout(r, 5))

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myGrip.value, 'foo')
  })

  spec('can observe initial value', () => {
    const myGrip = observeableGrip(varGrip<string>('foo'))

    const onChangeSpy = mock.fn()

    myGrip.addObserver(onChangeSpy)
    myGrip.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myGrip.value, 'bar')
  })
  spec('can remove an observer', () => {
    const myGrip = observeableGrip(varGrip<string>('foo'))

    const onChangeSpy = mock.fn()

    const remover = myGrip.addObserver(onChangeSpy)
    remover()

    myGrip.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 0)
  })
  spec('can observe multiple changes', () => {
    const myGrip = observeableGrip(varGrip<string>('foo'))

    const onChangeSpy = mock.fn()
    myGrip.addObserver(onChangeSpy)

    myGrip.set('bar')
    myGrip.set('baz')
    myGrip.set('buzz')

    assert.equal(onChangeSpy.mock.calls.length, 3)
  })
  spec('multiple observers', () => {
    const myGrip = observeableGrip(varGrip<string>('foo'))

    const onChangeSpy1 = mock.fn()
    const onChangeSpy2 = mock.fn()

    myGrip.addObserver(onChangeSpy1)
    myGrip.addObserver(onChangeSpy2)

    myGrip.set('bar')

    assert.equal(onChangeSpy1.mock.calls.length, 1)
    assert.equal(onChangeSpy2.mock.calls.length, 1)
  })
})


describe('observable', () => {
  spec('can observe a change', async () => {
    const myGrip = varGrip<string>('foo').observable

    const onChangeSpy = mock.fn()

    myGrip.addObserver(onChangeSpy, {observeInitialValue: true})

    await new Promise(r => setTimeout(r, 5))

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myGrip.value, 'foo')
  })

  spec('can observe initial value', () => {
    const myGrip = varGrip<string>('foo').observable

    const onChangeSpy = mock.fn()

    myGrip.addObserver(onChangeSpy)
    myGrip.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 1)
    assert.equal(myGrip.value, 'bar')
  })
  spec('can remove an observer', () => {
    const myGrip = varGrip<string>('foo').observable

    const onChangeSpy = mock.fn()

    const remover = myGrip.addObserver(onChangeSpy)
    remover()

    myGrip.set('bar')

    assert.equal(onChangeSpy.mock.calls.length, 0)
  })
  spec('can observe multiple changes', () => {
    const myGrip = varGrip<string>('foo').observable

    const onChangeSpy = mock.fn()
    myGrip.addObserver(onChangeSpy)

    myGrip.set('bar')
    myGrip.set('baz')
    myGrip.set('buzz')

    assert.equal(onChangeSpy.mock.calls.length, 3)
  })
  spec('multiple observers', () => {
    const myGrip = varGrip<string>('foo').observable

    const onChangeSpy1 = mock.fn()
    const onChangeSpy2 = mock.fn()

    myGrip.addObserver(onChangeSpy1)
    myGrip.addObserver(onChangeSpy2)

    myGrip.set('bar')

    assert.equal(onChangeSpy1.mock.calls.length, 1)
    assert.equal(onChangeSpy2.mock.calls.length, 1)
  })
})

describe('transformGrip', () => {
  spec('can convert from String to Int', () => {
    const grip1 = varGrip('a')
    const grip2 = transformGrip(grip1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    assert.equal(grip2.value, 10)
    assert.equal(grip1.value, 'a')
  })
  spec('can change outer grip', () => {
    const grip1 = varGrip('a')
    const grip2 = transformGrip(grip1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    grip2.set(15)
    assert.equal(grip2.value, 15)
    assert.equal(grip1.value, 'f')

    grip2.set(1965)
    assert.equal(grip2.value, 1965)
    assert.equal(grip1.value, '7ad')
  })
  spec('can change inner grip', () => {
    const grip1 = varGrip('a')
    const grip2 = transformGrip(grip1, {
      in: (v: number) => v.toString(16),
      out: (v: string) => parseInt(v, 16)
    })

    grip1.set('f')
    assert.equal(grip2.value, 15)
    assert.equal(grip1.value, 'f')

    grip1.set('7ad')
    assert.equal(grip2.value, 1965)
    assert.equal(grip1.value, '7ad')
  })
})


describe('readOnlyGrip', () => {
  spec('prevents modification to underlying grip', () => {
    const grip1 = varGrip(7)
    const wrap = readOnlyGrip(grip1)

    assert.equal(wrap.value, 7)

    wrap.set(3)

    assert.equal(wrap.value, 7)
  })
})

describe('readOnly', () => {
  spec('prevents modification to underlying grip', () => {
    const grip1 = varGrip(7)
    const wrap = grip1.readOnly

    assert.equal(wrap.value, 7)

    wrap.set(3)

    assert.equal(wrap.value, 7)
  })
})


describe('cookieGrip', () => {

  let mockDoc: Partial<Document>

  spec('should return the default value if no cookie is set', () => {
    const grip = cookieGrip('testCookie', 'defaultValue');
    grip.setDocument({
      cookie: ''
    });

    assert.equal(grip.value, 'defaultValue');
  });

  spec('should return the cookie value if it is set', () => {
    const grip = cookieGrip('testCookie', 'defaultValue');
    grip.setDocument({
      cookie: 'testCookie=cookieValue'
    });
    assert.equal(grip.value, 'cookieValue');
  });

  spec('should set the cookie value', () => {
    const grip = cookieGrip('testCookie', 'defaultValue');
    mockDoc = {
      cookie: ''
    }
    grip.setDocument(mockDoc);
    grip.set('newValue');
    assert(mockDoc.cookie!.includes('testCookie=newValue'));
  });

  spec('should update the cookie value', () => {

    const grip = cookieGrip('testCookie', 'defaultValue');
    mockDoc = {
      cookie: 'testCookie=oldValue'
    }
    grip.setDocument(mockDoc);
    grip.set('newValue');
    assert(mockDoc.cookie!.includes('testCookie=newValue'))
  });

  spec('should handle multiple cookies', () => {
    const grip1 = cookieGrip('cookie1', 'default1');
    const grip2 = cookieGrip('cookie2', 'default2');
    mockDoc = {
      cookie: 'cookie1=value1; cookie2=value2'
    }
    grip1.setDocument(mockDoc);
    grip2.setDocument(mockDoc);

    assert.equal(grip1.value, 'value1');
    assert.equal(grip2.value, 'value2');
  });
});


describe('objPropGrip', () => {
  spec('basic get and set', () => {

    const target = {
      foo: 1,
      bar: {
        buzz: [10, 11, 12]
      }
    }

    const fooGrip = objectPropGrip<{ foo: number }>('foo')
    assert.equal(fooGrip(target).value, 1)

    fooGrip(target).set(2)

    assert.equal(target.foo, 2)
  })

  spec('nesting', () => {

  })

  spec('works with arrays', () => {
    const ar = [10, 11, 12]

    const secondGrip = objectPropGrip<Array<number>>(1)

    const val = secondGrip(ar).value

    assert.equal(val, 11)
  })
})


describe('propGrip', () => {
  spec('gets the value of the specified property', () => {
    const obj = {a: 1, b: 2};
    const grip = varGrip(obj);
    const propGripA = propGrip(grip, 'a');

    assert.equal(propGripA.value, 1);
  });

  spec('sets the value of the specified property', () => {
    const obj = {a: 1, b: 2};
    const grip = varGrip(obj);
    const propGripA = propGrip(grip, 'a');

    propGripA.set(10);
    assert.equal(propGripA.value, 10);
    assert.equal(grip.value.a, 10);
  });

  spec('works on arrays', () => {
    const obj = ['a', 'b', 'c'];
    const agrip = varGrip(obj);
    const grip = propGrip(agrip, 1);
    assert.equal(grip.value, 'b');

    grip.set('d');
    assert.equal(grip.value, 'd');
    assert.deepEqual(obj, ['a', 'b', 'c']) // immutable
    assert.notEqual(agrip.value, obj); // new reference
    assert.deepEqual(agrip.value, ['a', 'd', 'c']);
  });

  spec('should not affect other properties', () => {
    const obj = {a: 1, b: 2};
    const grip = varGrip(obj);
    const propGripA = propGrip(grip, 'a');

    propGripA.set(10);
    assert.equal(grip.value.b, 2);
  });

  spec('should work with nested objects', () => {
    const obj = {a: {x: 1, y: 2}, b: 2};
    const grip = varGrip(obj);
    const propGripA = propGrip(grip, 'a');
    const nestedPropGripX = propGrip(propGripA, 'x');

    nestedPropGripX.set(10);
    assert.equal(nestedPropGripX.value, 10);
    assert.equal(grip.value.a.x, 10);
  });
});