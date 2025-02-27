/**
 The "lens" design pattern is used to abstract away the process of
 accessing and modifying nested data structures in a functional
 and immutable way. It provides a way to focus on a specific
 part of a data structure, allowing you to view and update
 that part without directly manipulating the entire structure.

 @see https://github.com/hatashiro/lens.ts/blob/master/test/test_proxy.ts
 @see https://github.com/atomicobject/lenses
 */

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

export function inMemoryLens<T>(initialValue: T): Lens<T> {
  return new InMemoryLens(initialValue)
}

//export function into<T>(Lens<T>,prop: string|number): Lens<U> {

// composition, failure, multiplicity, transformation, and representation

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
      value: (handler: Observer<T>, { observeInitialValue }: ObserverOptions = { observeInitialValue: false }): () => void => {
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