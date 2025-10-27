import {strict as assert} from 'node:assert'
import {describe, test} from 'node:test'


declare const _encoding: unique symbol;

export type BrandedString<Brand extends string = "Raw"> = string & { readonly [_encoding]: Brand };

export type RawString = BrandedString<'Raw'>;

export type AddEncoding<NewEncoding extends string, S extends string> =
    BrandedString<`${S extends BrandedString<infer OldEncoding> ? `${OldEncoding}|${NewEncoding}` : 'Raw'}`>;

type LastEncodingOf<S extends BrandedString<string>> =
    S extends BrandedString<`${infer _}|${infer Last}`> ? Last : S extends BrandedString<infer Only> ? Only : never;

// type WithLastEncodingOf<NewEncoding extends string> =
//     BrandedString<`${LastEncodingOf<S>}|${NewEncoding}`>;

function withEncoding<NewEncoding extends string, S extends string>(s: S) {
    return s as AddEncoding<NewEncoding, S>;
}

const s = "Hello, World!" as RawString;
const urlEncoded2 = withEncoding<'URL'>("Hello, World!")
const urlEncoded = withEncoding<'URLEncoded'>(s);
const jsEscaped = withEncoding<'JSEscaped'>(urlEncoded);
const base64Encoded = withEncoding<'Base64'>(jsEscaped);

type x = (typeof base64Encoded) | never
//: BrandedString<'Raw|URLEncoded|JSEscaped|Base64'> = base64Encoded;



export type LastEncodingOf<S extends string> =
    S extends BrandedString<`${infer Rest}|${infer Last}`> ? BrandedString<Last> : S;

export type PopEncoding<S extends BrandedString<string>> =
    S extends BrandedString<`${infer _}|${infer Rest}`> ? BrandedString<Rest> : S;

export type JSEscapedString = BrandedString<'JSEscaped'>;
export type URLEncodedString = BrandedString<'URLEncoded'>;
export type HTMLEscapedString = BrandedString<'HTMLEscaped'>;
export type Base64String = BrandedString<'Base64'>;

export function brandedString<Brand extends string, E extends string, S extends BrandedString<E>>(raw: S) {
    return raw as BrandedString<Brand>;
}

for (let c of [
    '<script>alert("Hello & goodbye!")</script>',
    'Multi-line text with © ® ™ symbols',
    'JSON: {"key": "value\'s \\"quote\\" marks"}',
    'Email: user+test@example.com',
    'Base64 chars: +/=',
    'XML: <user role="admin">'
]) {

    describe(`BrandedString transformations for: ${c}`, () => {
        // test('base64 encode/decode', () => {
        //     const b64 = base64encode(c)
        //     const decoded = base64decode(b64)
        //     assert.equal(decoded, c)
        // })

        test('url encode/decode', () => {
            const encoded = urlEncode(c)
            const decoded = urlDecode(encoded)
            assert.equal(decoded, c)
        })

        // test('sql escape/unescape', () => {
        //     const escaped = sqlEscape(c)
        //     const unescaped = sqlUnescape(escaped)
        //     assert.equal(unescaped, c)
        // })
        //
        // test('html escape/unescape', () => {
        //     const escaped = htmlEscape(c)
        //     const unescaped = htmlUnescape(escaped)
        //     assert.equal(unescaped, c)
        // })
    })
}


console.log('BrandedString tests passed')


export function urlEncode<S extends string>(s: S) {
    return encodeURIComponent(s) as AddEncoding<'URLEncoded', S>
}

// export function urlDecode<S extends LastEncodingOf<'URLEncoded'>>(encoded: S) {
//     return decodeURIComponent(encoded) as PopEncoding<S>;
// }
export function urlDecode<S extends  (string & { readonly [_encoding]: 'URLEncoded'})>(encoded: S) {
    return decodeURIComponent(encoded) as PopEncoding<S>;
}

export function base64encode(raw: RawString): Base64String {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(raw, 'utf8').toString('base64') as Base64String;
    }
    const bytes = new TextEncoder().encode(raw);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin) as Base64String;
}

export function base64decode(b64: Base64String): RawString {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(b64, 'base64').toString('utf8') as RawString;
    }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes) as RawString;
}


export function sqlEscape(raw: RawString): SQLEscapedString {
    return raw
        .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, char => {
            switch (char) {
                case "\0":
                    return "\\0";
                case "\x08":
                    return "\\b";
                case "\x09":
                    return "\\t";
                case "\x1a":
                    return "\\z";
                case "\n":
                    return "\\n";
                case "\r":
                    return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%":
                    return "\\" + char; // prepends a backslash to backslash, percent, and single/double quotes
            }
            return char;
        }) as SQLEscapedString;
}

export function sqlUnescape(escaped: SQLEscapedString): RawString {
    return escaped
        .replace(/\\([\0\x08\x09\x1a\n\r"'\\\%])/g, "$1") as RawString;
}

// Add the type definition
export type SQLEscapedString = BrandedString<'SQLEscaped'>;



export function htmlEscape(raw: RawString): HTMLEscapedString {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;') as HTMLEscapedString;
}

export function htmlUnescape(escaped: HTMLEscapedString): RawString {
    return escaped
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'") as RawString;
}
