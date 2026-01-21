export type AttrMethods<Attrs extends Array<string> | undefined> = Attrs extends Array<string> ? Readonly<{
  [K in StripAnnotations<Attrs[number]>]: string
}> : {}

export function stripAnnotations<S extends string, T = StripAnnotations<S>>(attr: S) {
  return attr.replace(/[*`🗱]/g, '') as T;
}

export function requiredAttrs<S extends string, T = StripAnnotations<S>>(attrs?: Array<S>): Array<T> {
  return attrs
    ? attrs.filter(a => a.includes('*')).map(a => stripAnnotations(a))
    : []
}

export function observedAttrs<S extends string, T = StripAnnotations<S>>(attrs?: Array<S>): Array<T> {
  return attrs
    ? attrs.filter(a => a.includes('🗱')).map(a => stripAnnotations(a))
    : []
}

export type StripAnnotations<T> = T extends `${infer U}*${infer Ignore}`
  ? U extends `${infer F}🗱` ? F : U
  : T extends `${infer F}🗱` ? F : T