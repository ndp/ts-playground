/*
The Grip class is an abstract class that represents a grip,
which is used to access and modify nested data structures
in an encapsulated way. It's inspired from the
Lens design pattern, and might just be the same thing.

The "lens" design pattern is used to abstract away the process of
accessing and modifying nested data structures in a functional
and immutable way. It provides a way to focus on a specific
part of a data structure, allowing you to view and update
that part without directly manipulating the entire structure.

This "Grip" differs mainly in that it's more of a wrapper
around a specific "thing", and abstracting away the
access to its contents, rather than being a "lens", or
"view into" some type of thing. This is more what I
needed for my implementation, so I'm using it (for now).

You likely will not use the Grip class itself, but rather the
few constructor functions: inMemoryGrid, cookieGrip, manualGrid,
etc.

There are a couple modifiers, `readOnly` and `observable`.
These  are currently contained within the class, but may be
removed at some later point (@see the evolution of RxJS).

@see [traditional lens](https://github.com/hatashiro/lens.ts)
@see [traditional lens](https://github.com/atomicobject/lenses)

Methods:
get value(): T: Abstract getter method to retrieve the value.
set(newValue: T): void: Abstract setter method to set a new value.
get readOnly(): Returns a read-only version of the grip.
get observable(): Returns an observable version of the grip.
*/
export abstract class Grip<T> {
  abstract get value(): T;

  abstract set(newValue: T): void;

  /**
   * Returns a new grip whose `set` method does nothing.
   */
  get readOnly() {
    return readOnlyGrip(this)
  }

  /**
   * Returns an observable version of the grip, with a new
   * function `addObserver`.
   *
   * `addObserver` accepts two parameters:
   *  - a function that is called whenever the `set` function
   *    is called on the grip.
   *  - `options`, with values:
   *    - `observeInitialValue` - whether to call the observer
   *      when it initially added. Defaults to `false`.
   */
  get observable() {
    return observeableGrip(this)
  }
}


/**
 * The `varGrip` function creates a grip on a mutable variable, and is
 * given initial value.
 *
 * @param initialValue - The initial value to be stored in the grip.
 * @returns A new instance of `Grip` with the provided initial value.
 */
export function varGrip<T>(initialValue: T): Grip<T> {
  return new VarGrip(initialValue);
}

/**
 * Creates a grip on a cookie with a default value.
 *
 * @param cookieName - The name of the cookie.
 * @param defawlt - The default value if the cookie does not exist.
 * @returns A new instance of a `Grip`.
 */
export function cookieGrip(cookieName: string, defawlt: string) {
  return new CookieGrip(cookieName, defawlt);
}

/**
 * Transforms a grip by applying the provided casting functions.
 *
 * @template A - The type of the original grip's value.
 * @template B - The type of the transformed grip's value.
 * @param {L} grip - The original grip to be transformed.
 * @param {Object} casts - An object containing the casting functions.
 * @param {Function} casts.in - The function to cast from type B to type A.
 * @param {Function} casts.out - The function to cast from type A to type B.
 * @returns A new grip with the transformed value type.
 */
export function transformGrip<A, B, L extends Grip<A>>(
  grip: L,
  casts: { in: (b: B) => A; out: (a: A) => B }
): OmitGripMethods<L> & Grip<B> {
  return Object.create(grip, {
    value: {
      get() {
        return casts.out(grip.value);
      }
    },
    set: {
      value(newValue: B) {
        grip.set(casts.in(newValue));
      }
    }
  });
}

/**
 * Combines two grips, using the value from the target grip if defined,
 * otherwise falling back to the value from the fallback grip.
 *
 * @param {L1} target - The primary grip to use.
 * @param {L2} fallback - The fallback grip to use if the target grip's value is undefined.
 * @returns {Grip<T1Req | T2>} A new grip that combines the target and fallback grips.
 */
export function withFallbackGrip<
  T1, T2,
  L1 extends Grip<T1>, L2 extends Grip<T2>, T1Req = ExcludeUndefined<T1>
>(target: L1, fallback: L2): Grip<T1Req | T2> {
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


/**
 * Creates a manual grip with custom getter and setter functions.
 *
 * @param context - Optional context to be passed to the getter and setter functions.
 * @returns A new instance of a `Grip`.
 */
export function manualGrip<T>(getter: () => T, setter: (value: T) => void): Grip<T>;
export function manualGrip<T, C>(getter: (context: C) => T, setter: (value: T, context: C) => void, context: C): Grip<T>;
export function manualGrip<T, C>(
  getter: C extends undefined ? () => T : (context: C) => T,
  setter: C extends undefined ? (value: T) => void : (value: T, context: C) => void,
  context?: C
): Grip<T> {
  return new ManualGrip(getter, setter, context as C);
}

/**
 * Creates a grip on a property of an object.
 *
 * @param prop - The property to create a grip on.
 * @returns A function that takes a target object and returns a
 * grip on the specified property.
 */
export function objectPropGrip<
  T,
  Target = T extends Grip<infer X> ? X : T,
  P extends keyof Target = keyof Target
>(prop: P): (target: Target) => Grip<Target[P]> {
  return (target: Target) => new ObjectPropGrip<Target, P>(prop, target);
}

/**
 * Creates a grip on a property of a grip.
 *
 * @param grip - The grip to create a property grip on.
 * @param property - The property to create a grip on.
 * @returns A new instance of `Grip` for the specified property.
 */
export function propGrip<
  L extends Grip<S>,
  P extends keyof S,
  S = L extends Grip<infer U> ? U : never,
  T = P extends keyof S ? S[P] : ElementType<S>
>(grip: L, property: P): Grip<T> {
  return Object.create(grip, {
    value: {
      get(): T {
        const subj = grip.value as any;
        return subj[property];
      }
    },
    set: {
      value(newValue: T) {
        const value = grip.value;

        if (Array.isArray(value)) {
          const newObject = [...value] as any;
          newObject[property] = newValue;
          grip.set(newObject);
        } else {
          const newObject = { ...value, [property]: newValue };
          grip.set(newObject);
        }
      }
    }
  });
}

export function observeableGrip<T, L extends Grip<T>>(grip: L):
  L & { addObserver: (handler: Observer<T>, options?: ObserverOptions) => () => void } {
  const observers: Array<Observer<T>> = [];

  return Object.create(grip, {
    set: {
      value: (newValue: T) => {
        const oldValue = grip.value;
        grip.set(newValue);
        observers.forEach(observer => observer(newValue, oldValue));
      }
    },
    addObserver: {
      value: (handler: Observer<T>, {observeInitialValue}: ObserverOptions = {observeInitialValue: false}): () => void => {
        observers.push(handler);
        if (observeInitialValue) setTimeout(() => handler(grip.value, undefined), 0);
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

export function readOnlyGrip<T, L extends Grip<T>>(grip: L): L {
  return Object.create(grip, {
    set: {
      value: (_value: T) => {
        // Do nothing to prevent modification
      }
    }
  });
}


/*
The VarGrip class extends Grip and provides an in-memory implementation of a grip.
It's a lot like a plain old variable, with a few more features (observability, readonly).
 */
class VarGrip<T> extends Grip<T> {

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
The CookieGrip class extends Grip and provides an implementation
of a grip backed by browser cookies. Assumes all values are strings.

A `document` may be injected to facilitate testing.
 */
export class CookieGrip extends Grip<string> {
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




class ManualGrip<T, C = undefined> extends Grip<T> {
  constructor(
    private readonly getter: C extends undefined ? () => T : (context: C) => T,
    private readonly setter: C extends undefined ? (value: T) => void : (value: T, context: C) => void,
    private readonly context?: C
  ) {
    super();
  }

  get value(): T {
    if (this.context === undefined) {
      return (this.getter as () => T)();
    } else {
      return (this.getter as (context: C) => T)(this.context as C);
    }
  }

  set(newValue: T): void {
    if (this.context === undefined) {
      (this.setter as (value: T) => void)(newValue);
    } else {
      (this.setter as (value: T, context: C) => void)(newValue, this.context as C);
    }
  }
}

export class ObjectPropGrip<
  Target extends Record<P, V>,
  P extends keyof Target = keyof Target,
  V = Target[P]//Target extends Record<K, infer k> ? k : never
> extends Grip<V> {

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


// Type utilities
type ObjectWithProperty<P extends PropertyKey, V> = {
  [K in P]: V;
};
type KeyOf<T> = T extends any[] ? number : keyof T;
type ElementType<T> = T extends (infer U)[] ? U : never;
type Observer<T> = (next: T, prev: T | undefined) => void;
type ObserverOptions = { observeInitialValue: boolean };
type ExcludeUndefined<T> = T extends undefined ? never : T;
type OmitGripMethods<T> = Omit<T, 'value' | 'set'>;