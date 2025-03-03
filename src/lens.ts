/**
 The "lens" design pattern is used to abstract away the process of
 accessing and modifying nested data structures in a functional
 and immutable way. It provides a way to focus on a specific
 part of a data structure, allowing you to view and update
 that part without directly manipulating the entire structure.

 @see https://github.com/hatashiro/lens.ts/blob/master/test/test_proxy.ts
 @see https://github.com/atomicobject/lenses
 */


/*
The Lens class is an abstract class that represents a lens,
which is used to access and modify nested data structures
in a functional and immutable way.
Methods:
get value(): T: Abstract getter method to retrieve the value.
set(newValue: T): void: Abstract setter method to set a new value.
get readOnly(): Returns a read-only version of the lens.
get observable(): Returns an observable version of the lens.
 */
import assert from "node:assert/strict";

export abstract class Lens<T> {
  abstract get value(): T;

  abstract set(newValue: T): void;

  get readOnly() {
    return readOnlyLens(this)
  }

  get observable() {
    return observeableLens(this)
  }

}

/*
The InMemoryLens class extends Lens and provides an in-memory implementation of a lens.
It's a lot like a plain old variable, with a few more features (observability, readonly).
 */
class InMemoryLens<T> extends Lens<T> {

  private val: T

  constructor(value: T) {
    super()
    this.val = value
  }

  set(newValue: T) {
    this.val = newValue
  }

  get value() {
    return this.val
  }

}

/*
The CookieLens class extends Lens and provides an implementation
of a lens backed by browser cookies. Assumes all values are strings.

A `document` may be injected to facilitate testing.
 */
export class CookieLens extends Lens<string> {
  private _testingDocument: Partial<Document> | null = null

  constructor(private readonly name: string, private readonly defawlt: string) {
    super()
  }

  get value() {
    return this.readCookie(this.name) ?? this.defawlt
  }

  set(newValue: string) {
    this.document().cookie = this.name + '=' + newValue + ';path=/;SameSite=Strict'
  }

  setDocument(d: Partial<Document>) {
    this._testingDocument = d
  }

  private readCookie(name: string): string | null {
    const nameEQ = name + '='
    const cookies: string | undefined = this.document().cookie
    if (!cookies) return null

    const ca = cookies.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  // For testing...
  private document(): Partial<Document> {
    return this._testingDocument ?? window.document
  }
}



export function inMemoryLens<T>(initialValue: T): Lens<T> {
  return new InMemoryLens(initialValue)
}

export function cookieLens(cookieName: string, defawlt: string) {
  return new CookieLens(cookieName, defawlt)
}




/*
L E N S   D E C O R A T O R S
 */

type KeyOf<T> = T extends any[] ? number : keyof T;
type ElementType<T> = T extends (infer U)[] ? U : never;
/*
const obj = { a: 1, b: "2" };
const lens = inMemoryLens(obj);
type S = typeof lens extends Lens<infer U> ? U : never
type P = 'a'
type T = P extends keyof S ? S[P] : never
const propLensA = propLens(lens, 'a');
const propLensB = propLens(lens, 'b');
*/
/*
const obj = ['a','b','c'];
type Keys = keyof typeof obj;
const lens = inMemoryLens(obj);
const propLens = propLens(lens, 1);
assert.equal(propLens.value, 'b');
type S = typeof lens extends Lens<infer U> ? U : never
type P = 2
type T = P extends keyof S ? S[P] : never
const propLensA = propLens(lens, 'a');
const propLensB = propLens(lens, 'b');
/* */

// Could reverse these and
// default S to {[k in P]: V}
export function propLens<
  L extends Lens<S>,
  P extends keyof S,
  S = L extends Lens<infer U> ? U : never,
  T = P extends keyof S ? S[P] : ElementType<S>>(lens: L, property: P): Lens<T> {
  return Object.create(lens, {
    value: {
      get(): T {
        const subj = lens.value as any
        return subj[property];
      }
    },
    set: {
      value(newValue: T) {
        const value = lens.value;

        if (Array.isArray(value)) {
          const newObject = [...value] as any;
          newObject[property] = newValue;
          lens.set(newObject);
        } else {
          const newObject = { ...value, [property]: newValue };
          lens.set(newObject);
        }
      }
    }
  })
}

type Observer<T> = (next: T, prev: T | undefined) => void
type ObserverOptions = { observeInitialValue: boolean }

export function observeableLens<T, L extends Lens<T>>(lens: L):
  L & { addObserver: (handler: Observer<T>, options?: ObserverOptions) => () => void } {
  const observers: Array<Observer<T>> = [];

  return Object.create(lens, {
    set: {
      value: (newValue: T) => {
        const oldValue = lens.value;
        lens.set(newValue);
        observers.forEach(observer => observer(newValue, oldValue));
      }
    },
    addObserver: {
      value: (handler: Observer<T>, {observeInitialValue}: ObserverOptions = {observeInitialValue: false}): () => void => {
        observers.push(handler);
        if (observeInitialValue) setTimeout(() => handler(lens.value, undefined), 0);
        return () => {
          const index = observers.indexOf(handler);
          if (index > -1) {
            observers.splice(index, 1);
          }
        };
      }
    }
  });

}

type OmitLensMethods<T> = Omit<T, 'value' | 'set'>;

export function transformLens<A, B, L extends Lens<A>>(
  lens: L,
  casts: { in: (b: B) => A; out: (a: A) => B }): OmitLensMethods<L> & Lens<B> {
  return Object.create(lens, {
    value: {
      get() {
        return casts.out(lens.value);
      }
    },
    set: {
      value(newValue: B) {
        lens.set(casts.in(newValue));
      }
    }
  });
}

type ExcludeUndefined<T> = T extends undefined ? never : T;

export function withFallbackLens<
  T1, T2,
  L1 extends Lens<T1>, L2 extends Lens<T2>, T1Req = ExcludeUndefined<T1>>(
  target: L1,
  fallback: L2
): Lens<T1Req | T2> {
  return Object.create(target, {
    value: {
      get() {
        const targetValue = target.value;
        return targetValue === undefined ? fallback.value : targetValue as T1Req | T2;
      }
    },
    set: {
      value(newValue: T1Req | T2) {
        fallback.set(newValue as T2);
        target.set(newValue as T1);
      }
    }
  });
}

export function readOnlyLens<T, L extends Lens<T>>(lens: L): L {
  return Object.create(lens, {
    set: {
      value: (_value: T) => {
        // Do nothing to prevent modification
      }
    }
  });
}

