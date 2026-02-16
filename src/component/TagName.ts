declare const tagNameBrand: unique symbol

type LegalTagNameLiteral<T extends string> =
  T extends `${string}-${string}`
    ? T extends Lowercase<T>
      ? T extends `${string} ${string}` | `${string}\n${string}` | `${string}\t${string}`
        ? never
        : T
      : never
    : never

export type TagName = string & { readonly [tagNameBrand]: true }

export type TagNameLiteral<T extends string> = LegalTagNameLiteral<T>

const forbiddenCustomElementNames = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph'
])

export function isValidTagName(tagName: string): tagName is TagName {
  if (typeof tagName !== 'string') return false
  if (tagName.length === 0) return false
  if (tagName !== tagName.toLowerCase()) return false
  if (/\s/.test(tagName)) return false
  if (forbiddenCustomElementNames.has(tagName)) return false

  return /^[a-z][a-z0-9._-]*-[a-z0-9._-]*$/.test(tagName)
}

export function assertValidTagName(tagName: string): asserts tagName is TagName {
  if (!isValidTagName(tagName)) {
    throw new Error(`Invalid custom element tag name: "${tagName}"`)
  }
}
