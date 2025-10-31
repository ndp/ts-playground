import {strict as assert} from 'node:assert'
import {describe, test} from 'node:test'

import { 
    base64encode, base64decode, 
    htmlEscape, htmlUnescape, 
    urlEncode, urlDecode,
    shellEscape, shellUnescape,
    sqlEscape, sqlUnescape,
    encodedAs
 } from './encoded-string.ts';

 import type { AddEncoding } from './encoding-string.ts'


const original = '<tag attr="x & y">Hello / world?</tag>';
const b64 = base64encode(htmlEscape(urlEncode(original)));

// The line below demonstrates the compiler error described:
// "Argument type string & { readonly _encoding: ['URL','HTML','base64'] } is not assignable to parameter type LastEncodedAs<'base64'>"
const decoded = base64decode(b64);

console.log(decoded);




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
            const plain = encodedAs<'Shell'>('plain-string-with-\\-and-\'-chars');
            const out = shellUnescape(plain); // runtime check; ensure no crash and unchanged
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
                const un = shellUnescape(escaped);
                assert.equal(un, raw);
            } finally {
                // restore
                Object.defineProperty(process, 'platform', {value: origPlatform});
            }
        });
    });

}



/**
 *
 */

/*
export type AssertEqual<T, Expected> = [T] extends [Expected]
    ? [Expected] extends [T]
        ? true
        : false
    : false;


const ss2: EncodedString = "" as EncodedString
const ss3: EncodedString<['URL']> = "" as EncodedString<['URL']>

// AddEncoding
const ae0: EncodedString<['URL']> = "" as unknown as AddEncoding<'URL', "">
const ae2: EncodedString<['HTML']> = ss2 as unknown as AddEncoding<'HTML', EncodedString>
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

*/