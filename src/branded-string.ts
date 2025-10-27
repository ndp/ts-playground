import {strict as assert} from 'node:assert'
import {describe, test} from 'node:test'
export type AssertEqual<T, Expected> = [T] extends [Expected]
  ? [Expected] extends [T]
    ? true
    : false
  : false;


  type First<T extends any[]> = T extends [] ? never : T[0]
  

  type Pop<T extends unknown[]> = T extends [...infer U, unknown] ? U : never
  type Push<T extends unknown[], U> = [...T, U]
  type Last<T extends unknown[]> = [never, ...T][T["length"]];


type Encoding = 'URL' | 'Base64' | 'HTML' | 'XML' | 'SQL'
type Encodings = Array<Encoding>

export type SmartStr<Encs extends Encodings = []> = string & { readonly [_encoding]: Encs };


const ss2: SmartStr = "" as SmartStr
const ss3: SmartStr<['URL']> = "" as SmartStr<['URL']>

// AddEncoding
const ae0: SmartStr<['URL']> = "" as unknown as AddEncoding<'URL', "">
const ae2: SmartStr<['HTML']> = ss2 as unknown as AddEncoding<'HTML', typeof ss2>
const ae3: SmartStr<['URL', 'HTML']> = ss3 as unknown as AddEncoding<'HTML', typeof ss3>
const ae4: SmartStr<['URL', 'HTML', 'URL']> = ae3 as unknown as AddEncoding<'URL', typeof ae3>

type t0 = AssertEqual<AddEncoding<'URL', "">, SmartStr<['URL']>>
type t1 = AssertEqual<AddEncoding<'URL', SmartStr<['HTML']>>, SmartStr<['URL']>>
type t2 = AssertEqual<AddEncoding<'URL', SmartStr<['HTML', 'HTML']>>, SmartStr<['URL']>>
type t3 = AssertEqual<AddEncoding<'URL', typeof ss2>, SmartStr<['URL']>>
type t4 = AssertEqual<AddEncoding<'URL', typeof ss3>, SmartStr<['URL']>>

// LastEncodingOf
type le0 = AssertEqual<LastEncodingOf<typeof ae0>, 'HTML'>
type le1 =  AssertEqual<LastEncodingOf<AddEncoding<'HTML', AddEncoding<'URL', "">>>, 'HTML'>
type le2 =  AssertEqual<LastEncodingOf<typeof ae2>, 'HTML'>
type le3 =  AssertEqual<LastEncodingOf<typeof ae3>, 'HTML'>
type le4 =  AssertEqual<LastEncodingOf<typeof ae4>, 'URL'>
type leo = le0 & le1 & le2 & le3& le4

type pe1 =  PreviousEncodingOf<typeof ss2>
type pe2 =  PreviousEncodingOf<typeof ss3>
type pe3 =  PreviousEncodingOf<typeof ae4>

type EncodingsOf<S> = S extends SmartStr<infer T> ? T : []
type LastEncodingOf<S> = Last<EncodingsOf<S>>
type PreviousEncodingOf<S> = Pop<EncodingsOf<S>>
  
type foo2 = EncodingsOf<typeof ss2>
type foo3 = EncodingsOf<typeof ss3>
type foo4 = EncodingsOf<typeof ae4>

type floo2 = LastEncodingOf<typeof ss2>
type floo3 = LastEncodingOf<typeof ss3>
type floo4 = LastEncodingOf<typeof ae4>


type AddEncoding<NewEncoding extends Encoding, ExistingStr extends unknown> =
  ExistingStr extends SmartStr<infer ExistingEncodings> 
  ?  SmartStr<Push<ExistingEncodings, NewEncoding>> 
  : SmartStr<[NewEncoding]>;


declare const _encoding: unique symbol;
type LastEncodedAs<E extends Encoding> = (SmartStr<[E]> | SmartStr<[ ...any, E]>)


function withEncoding<NewEncoding extends Encoding, S extends string = string>(s: S) {
    return s as unknown as AddEncoding<NewEncoding, S>;
}

const s = "Hello, World!";
const urlEncoded2 = withEncoding<'URL'>("Hello, World!")
const urlEncoded = withEncoding<'URL'>(s);
const jsEscaped = withEncoding<'HTML'>(urlEncoded);
const base64Encoded = withEncoding<'Base64'>(jsEscaped);



for (let c of [
    '<script>alert("Hello & goodbye!")</script>',
    'Multi-line text with © ® ™ symbols',
    'JSON: {"key": "value\'s \\"quote\\" marks"}',
    'Email: user+test@example.com',
    'Base64 chars: +/=',
    'XML: <user role="admin">'
]) {

    describe(`SmartStr transformations for text: "${c}"`, () => {
        test('base64 encode/decode', () => {
            const b64 = base64encode(c)
            const decoded = base64decode(b64)
            assert.equal(decoded, c)
        })

        test('url encode/decode error', () => {
            // @ts-expect-error
            const decodedNo = urlDecode(c)

            const encoded = urlEncode(c)
            const decoded = urlDecode(encoded)

            // @ts-expect-error
            const decoded2 = urlDecode(decoded)
        })

        test('url encode/decode', () => {
            const encoded = urlEncode(c)
            const decoded = urlDecode(encoded)
            assert.equal(decoded, c)
        })

        test('double encode/decode', () => {
            const encoded1 = urlEncode(c)
            const encoded2 = urlEncode(encoded1)
            const decoded1 = urlDecode(encoded2)
            const decoded2 = urlDecode(decoded1)
            assert.equal(decoded2, c)
        })

        test('sql escape/unescape', () => {
            const escaped = sqlEscape(c)
            const unescaped = sqlUnescape(escaped)
            assert.equal(unescaped, c)
        })

        test('html escape/unescape', () => {
            const escaped = htmlEscape(c)
            const unescaped = htmlUnescape(escaped)
            assert.equal(unescaped, c)
        })

        test('base64 + URL', () => {
            const urlReady = urlEncode(base64encode(c))

            const fromUrl = base64decode(urlDecode(urlReady)) 

            assert.equal(fromUrl, c)

        })
    })
}


console.log('BrandedString tests passed')


export function urlEncode<S extends string>(s: S) {
    return encodeURIComponent(s) as AddEncoding<'URL', S>
}

export function urlDecode<S extends LastEncodedAs<'URL'>>(encoded: S) {
    return decodeURIComponent(encoded) as unknown as SmartStr<PreviousEncodingOf<S>>;
}

export function base64encode<S extends string>(raw: S) {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(raw, 'utf8').toString('base64') as AddEncoding<'Base64', S>;
    }
    const bytes = new TextEncoder().encode(raw);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin) as AddEncoding<'Base64', S>;
}

export function base64decode<S extends LastEncodedAs<'Base64'>>(b64: S) {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(b64, 'base64').toString('utf8') as unknown as PreviousEncodingOf<S>;
    }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes) as unknown as PreviousEncodingOf<S>;
}


export function sqlEscape<S extends string>(raw: S) {
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
        })  as AddEncoding<'SQL', S>;
}

export function sqlUnescape<S extends LastEncodedAs<'SQL'>>(escaped: S) {
    return escaped
        .replace(/\\([\0\x08\x09\x1a\n\r"'\\\%])/g, "$1") as unknown as PreviousEncodingOf<S>;
}


export function htmlEscape<S extends string>(raw: S) {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;') as AddEncoding<'HTML', S>;
}

export function htmlUnescape<S extends LastEncodedAs<'HTML'>>(escaped: S) {
    return escaped
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'") as unknown as PreviousEncodingOf<S>;
}
