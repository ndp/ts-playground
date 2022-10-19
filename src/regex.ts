type ExtractGroupNames<T> =
  T extends `${string}(?<${infer Name}>${infer Rest}` ?
  (Record<Name, string> & ExtractGroupNames<Rest>) :
  T extends `(?<${infer Name}>` ? Record<Name, string> : Record<never, any>

interface RegExpMatchedGroups<T> extends RegExpExecArray {
  groups: ExtractGroupNames<T>
}

interface RegexWithNamedGroup<S extends string> extends RegExp {
  exec (s: string): RegExpMatchedGroups<S>
}

type StringWithNamedGroup = `${string}(?<${string}>${string}`

interface RegExpConstructor {
  new<T extends StringWithNamedGroup> (pattern: T, flags?: string): RegexWithNamedGroup<T>;

  <T extends StringWithNamedGroup> (pattern: T, flags?: string): RegexWithNamedGroup<T>;
}

const nameroo = new RegExp('a(?<nameroo>.*)z')

let r = nameroo.exec('hello')?.groups.nameroo

const foobar = new RegExp('(?<foo>.*):(?<bar>.*)')

console.log(foobar.exec('andy:horse').groups.foo)
console.log(foobar.exec('andy:horse').groups.bar)
console.log(foobar.exec('andy:horse').groups)
