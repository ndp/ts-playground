import type {Expect, Equal, IsEmptyObject} from './util/typescript.ts'
import assert from 'node:assert/strict'


function baseFactory(_opts: FactoryOptions = {}) {
  return {name: 'FluidObject'}
}

type FactoryOptions = Record<PropertyKey, unknown>
type AddOption<
  T extends FactoryOptions,
  Extra extends Record<PropertyKey, unknown>>
  = T & Extra;

// type AddOptionTest0 = Expect<Equal<AddOption<undefined, { foo: string }>, { foo: string }>>
type AddOptionTest1 = Expect<Equal<AddOption<{}, { foo: string }>, { foo: string }>>
type AddOptionTest2 = Expect<Equal<AddOption<{ bar: number }, { foo: string }>, { bar: number; foo: string }>>
type AddOptionTest3 = Expect<Equal<AddOption<{ bar: number; baz: boolean }, { foo: string }>, {
  bar: number;
  baz: boolean;
  foo: string
}>>


function noArgs() {
  return {name: 'foo'}
}

function oneArg({one}: { one: string }) {
  return {name: 'foo'}
}


const built = baseFactory({});
type Test1 = Expect<Equal<typeof built, { name: string }>>


/*  Higher-order factory that adds a "prefix" option to the factory options,
    and prepends that prefix to the "name" property of the built object.
    This demonstrates how to change the types for the arguments.
*/
function addAnOption<
  TInOpts extends FactoryOptions,
  TReturnType extends { name: string } = { name: string },
  TOutOpts = AddOption<TInOpts, { prefix: string }>
>(factory: (opts: TInOpts) => TReturnType) {
  return (opts: TOutOpts) => {
    const obj = factory(opts as unknown as TInOpts)
    return {
      ...obj,
      name: `${(opts as { prefix: string }).prefix}-${obj.name}`
    }
  }
}


const factory2 = addAnOption(baseFactory);
type Test2b = Expect<Equal<typeof factory2, (a: { prefix: string }) => { name: string }>>

const built2 = factory2({prefix: 'Mr.'});

type Test2c = Expect<Equal<typeof built2, { name: string }>>
assert.equal(built2.name, 'Mr.-FluidObject');

const factory2b1 = (opts: { bob: string }) => ({name: 'One', job: 'Type Checker'})
const factory2b2 = addAnOption(factory2b1);
type Test2b1 = Expect<Equal<typeof factory2b2, (a: { bob: string, prefix: string }) => { name: string; job: string }>>

type Test2z = Test2b1 & Test2b & Test2c;


/*  Higher-order factory that adds a "suffix" option to the factory options,
    and appends that suffix to the "name" property of the built object.
    This demonstrates how to change the types for the arguments, and we have
    a way to test the commutativity.
*/
function addAnotherOption<
  TInOpts extends FactoryOptions,
  TReturnType extends { name: string } = { name: string },
  TOutOpts = AddOption<TInOpts, { suffix: string }>
>(f: (inOpts: TInOpts) => TReturnType) {
  return (opts: TOutOpts) => {
    const obj = f(opts as unknown as TInOpts)
    return {
      ...obj,
      name: `${obj.name}, ${(opts as { suffix: string }).suffix}`
    }
  }
}


const factory3 = addAnotherOption(baseFactory);
type Test3b = Expect<Equal<typeof factory3, (a: { suffix: string }) => { name: string }>>

const built3 = factory3({suffix: 'PhD.'});

type Test3c = Expect<Equal<typeof built3, { name: string }>>
assert.equal(built3.name, 'FluidObject, PhD.');

type Test3z = Test3b & Test3c;


/*  Higher-order factory that adds a method to the built object.
    This demonstrates how to change the types for the return value.
*/
function addToReturnType<
  TInOpts extends FactoryOptions,
  TInReturnType extends { name: string } = { name: string }
>(f: (inOpts: TInOpts) => TInReturnType) {
  return (opts: TInOpts) => {
    const baseObj = f(opts)
    return {
      ...baseObj,
      greet() {
        return `Hello, ${baseObj.name}!`
      }
    }
  }
}


const factory4 = addToReturnType(baseFactory);
type Test4b = Expect<Equal<ReturnType<typeof factory4>, { name: string; greet: () => string }>>

const built4 = factory4({});

type Test4c = Expect<Equal<typeof built4, { name: string; greet: () => string }>>
assert.equal(built4.name, 'FluidObject');
assert.equal(built4.greet(), 'Hello, FluidObject!');

type Test4z = Test4b & Test4c;


/*  Combine all the higher-order factories together. */
const combinedFactory5b = addAnOption(baseFactory)
const combinedFactory5c = addAnotherOption(combinedFactory5b)
const combinedFactory5d = addToReturnType(combinedFactory5c)


type Test5a = Expect<Equal<
  ReturnType<typeof combinedFactory5d>,
  { name: string; greet: () => string }
>>;

type Test5b = Expect<Equal<
  Parameters<typeof combinedFactory5d>,
  [a: { prefix: string; suffix: string }]
>>;

const built5 = combinedFactory5d({prefix: 'Dr.', suffix: 'PhD'});

type Test5c = Expect<Equal<typeof built5, { name: string; greet: () => string }>>
assert.equal(built5.name, 'Dr.-FluidObject, PhD');
assert.equal(built5.greet(), 'Hello, Dr.-FluidObject, PhD!');

type Test5z = Test5a & Test5b & Test5c;
