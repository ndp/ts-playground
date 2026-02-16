import type {Expect, Equal, IsUnknown} from './util/typescript.ts'
import assert from 'node:assert/strict'


/*
A basic factory knows how to make something from some options.
 */
function baseFactory(_opts: FactoryOptions = {}) {
  return {name: 'FluidObject'}
}

const built = baseFactory({});
type Test1 = Expect<Equal<typeof built, BaseProductType>>


/* Adding an option is just a matter of intersecting the existing options with a new object type. */
type FactoryOptions = unknown
type AddOption<
  T extends FactoryOptions,
  Extra extends Record<PropertyKey, unknown>> = IsUnknown<T> extends true ? Extra : T & Extra;
type BaseProductType = { name: string }

// @ts-expect-error - this is just for testing the type-level AddOption, so we want to allow it to be used with non-object types.
type AddOptionTest0 = Expect<Equal<AddOption<undefined, { foo: string }>, { foo: string }>>
type AddOptionTest1 = Expect<Equal<AddOption<{}, { foo: string }>, { foo: string }>>
type AddOptionTest2 = Expect<Equal<AddOption<{ bar: number }, { foo: string }>, { bar: number; foo: string }>>
type AddOptionTest3 = Expect<Equal<AddOption<{ bar: number; baz: boolean }, { foo: string }>, {
  bar: number;
  baz: boolean;
  foo: string
}>>


/*  Higher-order factory that adds a "prefix" option to the factory options,
    and prepends that prefix to the "name" property of the built object.
    This demonstrates how to change the types for the arguments.
*/
function addPrefixOption<
  TInOpts extends FactoryOptions,
  TProductType extends BaseProductType = BaseProductType,
  TOutOpts = AddOption<TInOpts, { prefix: string }>
>(factory: (opts: TInOpts) => TProductType) {
  return (opts: TOutOpts) => {
    const obj = factory(opts as unknown as TInOpts)
    return {
      ...obj,
      name: `${(opts as { prefix: string }).prefix} ${obj.name}`
    } satisfies TProductType
  }
}

/* Now, create a factory that adds a "prefix" option,
   and test that the types are what we expect,
   and that the implementation works as expected. */
const factory2 = addPrefixOption(baseFactory);
type Test2b = Expect<Equal<typeof factory2, (a: { prefix: string }) => BaseProductType>>


const built2 = factory2({prefix: 'Mr.'});
type Test2c = Expect<Equal<typeof built2, BaseProductType>>
assert.equal(built2.name, 'Mr. FluidObject');

// @ts-expect-error - missing required "prefix" property
const build2b = factory2({})

// @ts-expect-error - extra properties should NOT be allowed
const build2c = factory2({prefix: 'Dr.', extra: 123})

// Try with another factory that has different options, to test that
// the types are correct and that the order of applying the higher-order factories doesn't matter.
const factory2b1 = (opts: { bob: string }) => ({name: 'One', job: 'Type Checker'})
const factory2b2 = addPrefixOption(factory2b1);
type Test2b1 = Expect<Equal<typeof factory2b2, (a: { bob: string, prefix: string }) => { name: string; job: string }>>

type Test2z = Test2b1 & Test2b & Test2c;


/*  Higher-order factory that adds a "suffix" option to the factory options,
    and appends that suffix to the "name" property of the built object.
    This demonstrates how to change the types for the arguments, and we have
    a way to test the commutativity.
*/
function addSuffixOption<
  TInOpts extends FactoryOptions,
  TProductType extends BaseProductType = BaseProductType,
  TOutOpts = AddOption<TInOpts, { suffix: string }>
>(f: (inOpts: TInOpts) => TProductType) {
  return (opts: TOutOpts) => {
    const obj = f(opts as unknown as TInOpts)
    return {
      ...obj,
      name: `${obj.name}, ${(opts as { suffix: string }).suffix}`
    }
  }
}


const factory3 = addSuffixOption(baseFactory);
type Test3b = Expect<Equal<typeof factory3, (a: { suffix: string }) => BaseProductType>>

const built3 = factory3({suffix: 'PhD.'});

type Test3c = Expect<Equal<typeof built3, BaseProductType>>
assert.equal(built3.name, 'FluidObject, PhD.');

const factory3b = addPrefixOption(addSuffixOption(baseFactory));
const factory3c = addSuffixOption(addPrefixOption(baseFactory));
const build3b = factory3b({prefix: 'Dr.', suffix: 'MD'});
const build3c = factory3b({prefix: 'Dr.', suffix: 'MD'});
assert.equal(build3b.name, 'Dr. FluidObject, MD');
assert.equal(build3c.name, 'Dr. FluidObject, MD');

type Test3z = Test3b & Test3c;


/*  Higher-order factory that adds a method to the factory-built object.
    This demonstrates how to change the types for the return value.
*/
function addToProductType<
  TInOpts extends FactoryOptions,
  TInProductType extends BaseProductType = BaseProductType
>(f: (inOpts: TInOpts) => TInProductType) {
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


const factory4 = addToProductType(baseFactory);
type Test4b = Expect<Equal<ReturnType<typeof factory4>, { name: string; greet: () => string }>>

const built4 = factory4({});

type Test4c = Expect<Equal<typeof built4, { name: string; greet: () => string }>>
assert.equal(built4.name, 'FluidObject');
assert.equal(built4.greet(), 'Hello, FluidObject!');

type Test4z = Test4b & Test4c;


/*  Combine all the higher-order factories together. */
const combinedFactory5b = addPrefixOption(baseFactory)
const combinedFactory5c = addSuffixOption(combinedFactory5b)
const combinedFactory5d = addToProductType(combinedFactory5c)


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
assert.equal(built5.name, 'Dr. FluidObject, PhD');
assert.equal(built5.greet(), 'Hello, Dr. FluidObject, PhD!');

type Test5z = Test5a & Test5b & Test5c;


function addTypedToProductType<
  TaddTypedToProductType extends Record<PropertyKey, unknown>,
  TInOpts extends FactoryOptions,
  TInProductType extends BaseProductType = BaseProductType
>(add: TaddTypedToProductType, f: (inOpts: TInOpts) => TInProductType) {
  return (opts: TInOpts) => {
    const baseObj = f(opts)
    return {
      ...baseObj,
      ...add
    } satisfies TInProductType & TaddTypedToProductType
  }
}

const myDogFactory = addTypedToProductType({bark: () => console.log('woof!')}, combinedFactory5d)

myDogFactory({prefix: "Sir", suffix: "Esq."}).bark()
// @ts-expect-error
myDogFactory({prefix: "Sir", suffix: "Esq.", woof: "yeah"})

try {
// @ts-expect-error
  myDogFactory({prefix: "Sir", suffix: "Esq."}).nonexistentMethod()
} catch (e) {

}


type Decorator<
  TInOpts extends FactoryOptions,
  TInProductType extends BaseProductType = BaseProductType,
  TNewInput extends TInOpts = TInOpts,
  TNewProductType extends TInProductType = TInProductType
> = (inOpts: (opts: TInOpts) => TInProductType) => ((opts: TNewInput) => TNewProductType)


function decorateFactory<
  TInOpts extends FactoryOptions,
  TInProductType extends BaseProductType = BaseProductType,
  TNewInput extends TInOpts = TInOpts,
  TNewProductType extends TInProductType = TInProductType
>(decorator: Decorator<TInOpts, TInProductType, TNewInput, TNewProductType>,
  factory: (opts: TInOpts) => TInProductType): (opts: TNewInput) => TNewProductType {
  return decorator(factory)
}

function catDecorator<InOpts extends FactoryOptions, InProductType extends BaseProductType>(f: (opts: InOpts) => InProductType) {
  return (opts: InOpts) => {
    const obj = f(opts)
    return {
      ...obj,
      meow() {
        console.log('meow!')
      }
    }
  }
}

const catFactory = decorateFactory(
  catDecorator,
  combinedFactory5d
)

const cat = catFactory({prefix: "Whiskers", suffix: "the Cat"})
assert.equal(cat.name, 'Whiskers FluidObject, the Cat')
assert.equal(cat.greet(), 'Hello, Whiskers FluidObject, the Cat!')
cat.meow()