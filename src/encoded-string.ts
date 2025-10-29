import {strict as assert} from 'node:assert'
import {describe, test} from 'node:test'

type Encoding = 'URL' | 'base64' | 'HTML' | 'XML' | 'SQL' | 'Shell'
type EncodingSequence = Array<Encoding>

declare const _encoding: unique symbol;
export type EncodedString<E extends EncodingSequence = []> = string & { readonly [_encoding]: E };


type EncodingsOf<S> = S extends EncodedString<infer T> ? T : []
type LastEncodingOf<S> = Last<EncodingsOf<S>>
type PreviousEncodingOf<S> = Pop<EncodingsOf<S>>
type AddEncoding<NewEncoding extends Encoding, ExistingStr extends string> =
    ExistingStr extends EncodedString<infer ExistingEncodings>
        ? EncodedString<Push<ExistingEncodings, NewEncoding>>
        : EncodedString<[NewEncoding]>;

type LastEncodedAs<E extends Encoding> = EncodedString<[E]> | EncodedString<[...EncodingSequence, E]>

/*
Explicitly mark a string as having a given encoding. If the string already has an
encoding, the new encoding is added to the list. This is just a type-caste disguised
as a function.
 */
function encodedAs<NewEncoding extends Encoding, S extends string = string>(s: S) {
    return s as unknown as AddEncoding<NewEncoding, S>;
}


/*

FUNCTIONS

 */
export function urlEncode<S extends string>(s: S) {
    return encodeURIComponent(s) as AddEncoding<'URL', S>
}

export function urlDecode<S extends LastEncodedAs<'URL'>>(encoded: S) {
    return decodeURIComponent(encoded) as unknown as EncodedString<PreviousEncodingOf<S>>;
}

export function base64encode<S extends string>(raw: S) {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(raw, 'utf8').toString('base64') as AddEncoding<'base64', S>;
    }
    const bytes = new TextEncoder().encode(raw);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin) as AddEncoding<'base64', S>;
}

export function base64decode<S extends LastEncodedAs<'base64'>>(b64: S) {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(b64, 'base64').toString('utf8') as unknown as EncodedString<PreviousEncodingOf<S>>;
    }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes) as unknown as EncodedString<PreviousEncodingOf<S>>;
}


export function sqlEscape<S extends string>(raw: S) {
    return raw
        .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, char => {
            switch (char) {
                case "\"":
                case "'":
                case "\\":
                case "%":
                    return "\\" + char; // prepends a backslash to backslash, percent, and single/double quotes
            }
            return char;
        }) as AddEncoding<'SQL', S>;
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
        .replace(/&#39;/g, "'") as unknown as EncodedString<PreviousEncodingOf<S>>;
}


export function shellEscape<S extends string>(raw: S) {
    // Windows: wrap in double quotes and escape " \ and % (best-effort)
    if (typeof process !== 'undefined' && process.platform === 'win32') {
        const escaped = '"' + raw.replace(/(["\\%])/g, '\\$1') + '"';
        return escaped as AddEncoding<'Shell', S>;
    }
    // POSIX: wrap in single quotes and escape single quotes by '\'' sequence
    const escaped = "'" + raw.replace(/'/g, "'\\''") + "'";
    return escaped as AddEncoding<'Shell', S>;
}

export function shellUnescape<S extends LastEncodedAs<'Shell'>>(escaped: S) {
    if (typeof process !== 'undefined' && process.platform === 'win32') {
        // remove surrounding double quotes if present, then unescape backslash-escaped chars
        const s = String(escaped);
        if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
            const inner = s.slice(1, -1);
            return inner.replace(/\\(["\\%])/g, "$1") as unknown as EncodedString<PreviousEncodingOf<S>>;
        }
        return s.replace(/\\(["\\%])/g, "$1") as unknown as EncodedString<PreviousEncodingOf<S>>;
    }
    // POSIX: reverse the single-quote wrapping + '\'' sequences
    const str = String(escaped);
    if (str.length >= 2 && str[0] === "'" && str[str.length - 1] === "'") {
        const inner = str.slice(1, -1);
        return inner.replace(/'\\''/g, "'") as unknown as EncodedString<PreviousEncodingOf<S>>;
    }
    return str.replace(/'\\''/g, "'") as unknown as EncodedString<PreviousEncodingOf<S>>;
}


/*

  TESTS

 */
for (let c of [
    '',
    ' ',
    '\t',
    "\r",
    "\n",
    "We're the 99%!",
    '<script>alert("Hello & goodbye!")</script>',
    'Multi-line text with © ® ™ symbols',
    'JSON: {"key": "value\'s \\"quote\\" marks"}',
    'Email: user+test@example.com',
    'base64 chars: +/=',
    'XML: <user role="admin">'
]) {

    describe(`SmartStr transformations for text: "${c}"`, () => {
        test('base64 encode/decode', () => {
            const b64 = base64encode(c)
            const decoded = base64decode(b64)
            assert.equal(decoded, c)
        })

        test('url encode/decode', () => {
            const encoded = urlEncode(c)
            const decoded = urlDecode(encoded)
            assert.equal(decoded, c)
        })

        test('shell escape/unescape', () => {
            const escaped = shellEscape(c)
            const unescaped = shellUnescape(escaped)
            assert.equal(unescaped, c)
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

        test('url encode/decode error', () => {
            try {
                // @ts-expect-error
                urlDecode(c) // may blow up because it's not actually encoded
            } catch (URIError) {
            }

            try {
                const encoded = urlEncode(c)
                // @ts-expect-error
                urlDecode(urlDecode(encoded))
            } catch (URIError) {
            }
        })

        test('double encode/decode', () => {
            const encoded1 = urlEncode(c)
            const encoded2 = urlEncode(encoded1)
            const decoded1 = urlDecode(encoded2)
            const decoded2 = urlDecode(decoded1)
            assert.equal(decoded2, c)
        })

        test('base64 + URL', () => {
            const urlReady = urlEncode(base64encode(c))
            const fromUrl = base64decode(urlDecode(urlReady))
            assert.equal(fromUrl, c)
        })

    })

    describe('additional edge-case tests', () => {
        test('sql escape/unescape preserves NUL, control chars and percent', () => {
            const raw = '\0\x08\x09\x1a\n\r"\'\\%';
            const escaped = sqlEscape(raw);
            const unescaped = sqlUnescape(escaped);
            assert.equal(unescaped, raw);
        });

        test('shell escape/unescape handles single quotes, backslashes, percent and double quotes', () => {
            const raw = `O'Reilly \\ % "`;
            const escaped = shellEscape(raw);
            const unescaped = shellUnescape(escaped);
            assert.equal(unescaped, raw);
        });


        test('mixed encoding stack roundtrip (URL -> HTML -> base64 then reverse)', () => {
            const c = '<tag attr="x & y">Hello / world?</tag>';
            const b64 = base64encode(htmlEscape(urlEncode(c)));
            const html = base64decode(b64)
            const url = htmlUnescape(html)
            const decoded = urlDecode(url);
            assert.equal(decoded, c);
        });

        test('shellUnescape on non-wrapped value is a no-op', () => {
            const plain = 'plain-string-with-\\-and-\'-chars';
            const out = shellUnescape(plain as any); // runtime check; ensure no crash and unchanged
            assert.equal(out, plain);
        });

        test('TypeScript: calling unescape on raw strings should be a compile error', () => {
            // The following lines are intended to be checked by the TypeScript compiler.
            // @ts-expect-error
            urlDecode('not-encoded');
            // @ts-expect-error
            base64decode('also-not-encoded');
            // @ts-expect-error
            htmlUnescape('raw');
            // @ts-expect-error
            sqlUnescape('raw');
            // @ts-expect-error
            shellUnescape('raw');
        });

        test('simulate Windows shellEscape/unescape branch by temporarily overriding process.platform', () => {
            const origPlatform = process.platform;
            try {
                // override platform to win32 for the test (restore later)
                Object.defineProperty(process, 'platform', {value: 'win32'});
                const raw = `a "quoted" % and \\ backslash`;
                const escaped = shellEscape(raw);
                // Windows branch should wrap with double quotes
                assert.equal(escaped[0], '"');
                assert.equal(escaped[escaped.length - 1], '"');
                const un = shellUnescape(escaped as any);
                assert.equal(un, raw);
            } finally {
                // restore
                Object.defineProperty(process, 'platform', {value: origPlatform});
            }
        });
    });

}


export type AssertEqual<T, Expected> = [T] extends [Expected]
    ? [Expected] extends [T]
        ? true
        : false
    : false;


type First<T extends any[]> = T extends [] ? never : T[0]


type Pop<T extends unknown[]> = T extends [...infer U, unknown] ? U : never
type Push<T extends unknown[], U> = [...T, U]
type Last<T extends unknown[]> = [never, ...T][T["length"]];


/**
 *
 */
const ss2: EncodedString = "" as EncodedString
const ss3: EncodedString<['URL']> = "" as EncodedString<['URL']>

// AddEncoding
const ae0: EncodedString<['URL']> = "" as unknown as AddEncoding<'URL', "">
const ae2: EncodedString<['HTML']> = ss2 as unknown as AddEncoding<'HTML', typeof ss2>
const ae3: EncodedString<['URL', 'HTML']> = ss3 as unknown as AddEncoding<'HTML', typeof ss3>
const ae4: EncodedString<['URL', 'HTML', 'URL']> = ae3 as unknown as AddEncoding<'URL', typeof ae3>

type t0 = AssertEqual<AddEncoding<'URL', "">, EncodedString<['URL']>>
type t1 = AssertEqual<AddEncoding<'URL', EncodedString<['HTML']>>, EncodedString<['URL']>>
type t2 = AssertEqual<AddEncoding<'URL', EncodedString<['HTML', 'HTML']>>, EncodedString<['URL']>>
type t3 = AssertEqual<AddEncoding<'URL', typeof ss2>, EncodedString<['URL']>>
type t4 = AssertEqual<AddEncoding<'URL', typeof ss3>, EncodedString<['URL']>>

// LastEncodingOf
type le0 = AssertEqual<LastEncodingOf<typeof ae0>, 'HTML'>
type le1 = AssertEqual<LastEncodingOf<AddEncoding<'HTML', AddEncoding<'URL', "">>>, 'HTML'>
type le2 = AssertEqual<LastEncodingOf<typeof ae2>, 'HTML'>
type le3 = AssertEqual<LastEncodingOf<typeof ae3>, 'HTML'>
type le4 = AssertEqual<LastEncodingOf<typeof ae4>, 'URL'>
type leo = le0 & le1 & le2 & le3 & le4

type pe1 = PreviousEncodingOf<typeof ss2>
type pe2 = PreviousEncodingOf<typeof ss3>
type pe3 = PreviousEncodingOf<typeof ae4>


type foo2 = EncodingsOf<typeof ss2>
type foo3 = EncodingsOf<typeof ss3>
type foo4 = EncodingsOf<typeof ae4>

type floo2 = LastEncodingOf<typeof ss2>
type floo3 = LastEncodingOf<typeof ss3>
type floo4 = LastEncodingOf<typeof ae4>
