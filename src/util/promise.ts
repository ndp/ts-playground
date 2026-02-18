/*
An `isPromise` detector that narrows the type of the promise return type,
when returning `true`.
 */
export function isPromise<T = any>(obj: any):
  obj is T extends { then: (...args: unknown[]) => unknown } ? Promise<Awaited<T>> : never {
  return !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function';
}


// refs. https://github.com/then/is-promise
