/**
 The "lens" design pattern is used to abstract away the process of
 accessing and modifying nested data structures in a functional
 and immutable way. It provides a way to focus on a specific
 part of a data structure, allowing you to view and update
 that part without directly manipulating the entire structure.

 @see https://github.com/hatashiro/lens.ts/blob/master/test/test_proxy.ts
 @see https://github.com/atomicobject/lenses
 */
type Features<T> = {
  get readOnly(): Lens<T>
}

export abstract class Lens<T> {
  abstract get value(): T;
  abstract set(newValue: T): void;

  get readOnly(): Lens<T> {
    return new ReadOnlyLens(this)
  }
}
// export type Lens<T> = {
//   get value(): T;
//   set(newValue: T): void
// }
//
// export type OptionalLens<T> = {
//   get value(): T | undefined;
//   set(newValue: T): void
// }

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

class ObservableLens<T> extends Lens<T> {
  private lens: Lens<T>;
  private observers: Array<Observer<T>> = [];

  constructor(lens: Lens<T>) {
    super()
    this.lens = lens;
  }

  get value(): T {
    return this.lens.value;
  }

  set(newValue: T) {
    const oldValue = this.lens.value;
    this.lens.set(newValue);
    this.onChange(newValue, oldValue);
  }

  onChange(next: T, prev: T | undefined) {
    this.observers.forEach(observer => observer(next, prev));
  }

  addObserver(handler: Observer<T>, { observeInitialValue }: ObserverOptions = { observeInitialValue: false }): () => void {
    this.observers.push(handler);
    if (observeInitialValue) setTimeout(() => handler(this.lens.value, undefined), 0);
    return () => this.removeObserver(handler);
  }

  private removeObserver(handler: Observer<T>) {
    const index = this.observers.indexOf(handler);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }
}

type Observer<T> = (next: T, prev: T | undefined) => void
type ObserverOptions = { observeInitialValue: boolean }
// export type ObservableLens<T> = Lens<T> & {
//   // Add a change handler for the lens.
//   // Returns a function to remove the observer
//   onChange: (observer: Observer<T>, opts?: ObserverOptions) => () => void
// }

export function observeableLens<T extends string>(lens: Lens<T>): ObservableLens<T> {
  return new ObservableLens<T>(lens)
}


class TransformLens<A, B> extends Lens<B> {
  private target: Lens<A>;
  private casts: {
    in: (b: B) => A;
    out: (a: A) => B;
  };

  constructor(target: Lens<A>, casts: { in: (b: B) => A; out: (a: A) => B }) {
    super()
    this.target = target;
    this.casts = casts;
  }

  get value(): B {
    return this.casts.out(this.target.value);
  }

  set(newValue: B) {
    this.target.set(this.casts.in(newValue));
  }
}
export function transformLens<A, B>(
  target: Lens<A>,
  casts: {
    in: (b: B) => A,
    out: (a: A) => B
  }): Lens<B> {
 return new TransformLens<A,B>(target, casts)
  // return {
  //   get value() {
  //     return casts.out(target.value)
  //   },
  //   set(val) {
  //     target.set(casts.in(val))
  //   }
  // }
}

/**
  * Creates a lens that cascades through a series of lenses to find the first lens
  * with a non-undefined value.
  *
  * @param lenses - An array of lenses to cascade through.
  * @returns A lens that exposes the value of the first lens with a non-undefined value.
  */
class CascadingLens<T> extends Lens<T> {
  private lenses: Array<Lens<T>>;
  private last: Lens<T>;

  constructor(lens1: Lens<T>, ...rest: Array<Lens<T>>) {
    super()
    this.lenses = [lens1, ...rest];
    this.last = this.lenses.pop()!;
  }

  get value(): T {
    const lens = this.lenses.find(lens => lens.value !== undefined);
    return lens === undefined ? this.last.value : lens.value;
  }

  set(newValue: T): void {
    this.lenses.forEach(lens => lens.set(newValue));
    this.last.set(newValue);
  }
}
export function cascadingLens<T>(lens1: Lens<T>, ...rest: Array<Lens<T>>): Lens<T> {
  return new CascadingLens(lens1, ...rest)
  // const lenses = [lens1, ...rest]
  // const last = lenses.pop()!
  // return {
  //   get value() {
  //     const lens = lenses.find(lens => lens.value !== undefined)
  //     return lens === undefined ? last.value : lens.value
  //   },
  //   set: (value) => {
  //     lenses.forEach(lens => lens.set(value))
  //     last.set(value)
  //   }
  // }
}

/**
  * Creates a read-only lens that prevents modification of the underlying lens value.
  *
  * @param lens - The lens to be wrapped in a read-only lens.
  * @returns A read-only lens that exposes the value of the original lens but does not allow setting a new value.
  */
// export function readOnlyLens<T>(lens: Lens<T>) {
//   return new ReadOnlyLens(lens)
// }

export class ReadOnlyLens<T> extends Lens<T> {
  private target: Lens<T>;

  constructor(lens: Lens<T>) {
    super()
    this.target = lens;
  }

  get value(): T {
    return this.target.value;
  }

  set(_value: T): void {
    // Do nothing to prevent modification
  }
}

// Array util
function removeItem<T>(arr: Array<T>, value: T): Array<T> {
  const index = arr.indexOf(value)
  if (index > -1) {
    arr.splice(index, 1)
  }
  return arr
}
