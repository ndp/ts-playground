"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_assert_1 = require("node:assert");
var node_test_1 = require("node:test");
var encoded_string_ts_1 = require("./encoded-string.ts");
var original = '<tag attr="x & y">Hello / world?</tag>';
var b64 = (0, encoded_string_ts_1.base64encode)((0, encoded_string_ts_1.htmlEscape)((0, encoded_string_ts_1.urlEncode)(original)));
// The line below demonstrates the compiler error described:
// "Argument type string & { readonly _encoding: ['URL','HTML','base64'] } is not assignable to parameter type LastEncodedAs<'base64'>"
var decoded = (0, encoded_string_ts_1.base64decode)(b64);
console.log(decoded);
var _loop_1 = function (c) {
    (0, node_test_1.describe)("SmartStr transformations for text: \"".concat(c, "\""), function () {
        (0, node_test_1.test)('base64 encode/decode', function () {
            var b64 = (0, encoded_string_ts_1.base64encode)(c);
            var decoded = (0, encoded_string_ts_1.base64decode)(b64);
            node_assert_1.strict.equal(decoded, c);
        });
        (0, node_test_1.test)('url encode/decode', function () {
            var encoded = (0, encoded_string_ts_1.urlEncode)(c);
            var decoded = (0, encoded_string_ts_1.urlDecode)(encoded);
            node_assert_1.strict.equal(decoded, c);
        });
        (0, node_test_1.test)('shell escape/unescape', function () {
            var escaped = (0, encoded_string_ts_1.shellEscape)(c);
            var unescaped = (0, encoded_string_ts_1.shellUnescape)(escaped);
            node_assert_1.strict.equal(unescaped, c);
        });
        (0, node_test_1.test)('sql escape/unescape', function () {
            var escaped = (0, encoded_string_ts_1.sqlEscape)(c);
            var unescaped = (0, encoded_string_ts_1.sqlUnescape)(escaped);
            node_assert_1.strict.equal(unescaped, c);
        });
        (0, node_test_1.test)('html escape/unescape', function () {
            var escaped = (0, encoded_string_ts_1.htmlEscape)(c);
            var unescaped = (0, encoded_string_ts_1.htmlUnescape)(escaped);
            node_assert_1.strict.equal(unescaped, c);
        });
        (0, node_test_1.test)('url encode/decode error', function () {
            try {
                // @ts-expect-error
                (0, encoded_string_ts_1.urlDecode)(c); // may blow up because it's not actually encoded
            }
            catch (URIError) {
            }
            try {
                var encoded = (0, encoded_string_ts_1.urlEncode)(c);
                // @ts-expect-error
                (0, encoded_string_ts_1.urlDecode)((0, encoded_string_ts_1.urlDecode)(encoded));
            }
            catch (URIError) {
            }
        });
        (0, node_test_1.test)('double encode/decode', function () {
            var encoded1 = (0, encoded_string_ts_1.urlEncode)(c);
            var encoded2 = (0, encoded_string_ts_1.urlEncode)(encoded1);
            var decoded1 = (0, encoded_string_ts_1.urlDecode)(encoded2);
            var decoded2 = (0, encoded_string_ts_1.urlDecode)(decoded1);
            node_assert_1.strict.equal(decoded2, c);
        });
        (0, node_test_1.test)('base64 + URL', function () {
            var urlReady = (0, encoded_string_ts_1.urlEncode)((0, encoded_string_ts_1.base64encode)(c));
            var fromUrl = (0, encoded_string_ts_1.base64decode)((0, encoded_string_ts_1.urlDecode)(urlReady));
            node_assert_1.strict.equal(fromUrl, c);
        });
    });
    (0, node_test_1.describe)('additional edge-case tests', function () {
        (0, node_test_1.test)('sql escape/unescape preserves NUL, control chars and percent', function () {
            var raw = '\0\x08\x09\x1a\n\r"\'\\%';
            var escaped = (0, encoded_string_ts_1.sqlEscape)(raw);
            var unescaped = (0, encoded_string_ts_1.sqlUnescape)(escaped);
            node_assert_1.strict.equal(unescaped, raw);
        });
        (0, node_test_1.test)('shell escape/unescape handles single quotes, backslashes, percent and double quotes', function () {
            var raw = "O'Reilly \\ % \"";
            var escaped = (0, encoded_string_ts_1.shellEscape)(raw);
            var unescaped = (0, encoded_string_ts_1.shellUnescape)(escaped);
            node_assert_1.strict.equal(unescaped, raw);
        });
        (0, node_test_1.test)('mixed encoding stack roundtrip (URL -> HTML -> base64 then reverse)', function () {
            var c = '<tag attr="x & y">Hello / world?</tag>';
            var b64 = (0, encoded_string_ts_1.base64encode)((0, encoded_string_ts_1.htmlEscape)((0, encoded_string_ts_1.urlEncode)(c)));
            var html = (0, encoded_string_ts_1.base64decode)(b64);
            var url = (0, encoded_string_ts_1.htmlUnescape)(html);
            var decoded = (0, encoded_string_ts_1.urlDecode)(url);
            node_assert_1.strict.equal(decoded, c);
        });
        (0, node_test_1.test)('shellUnescape on non-wrapped value is a no-op', function () {
            var plain = (0, encoded_string_ts_1.encodedAs)('plain-string-with-\\-and-\'-chars');
            var out = (0, encoded_string_ts_1.shellUnescape)(plain); // runtime check; ensure no crash and unchanged
            node_assert_1.strict.equal(out, plain);
        });
        (0, node_test_1.test)('TypeScript: calling unescape on raw strings should be a compile error', function () {
            // The following lines are intended to be checked by the TypeScript compiler.
            // @ts-expect-error
            (0, encoded_string_ts_1.urlDecode)('not-encoded');
            // @ts-expect-error
            (0, encoded_string_ts_1.base64decode)('also-not-encoded');
            // @ts-expect-error
            (0, encoded_string_ts_1.htmlUnescape)('raw');
            // @ts-expect-error
            (0, encoded_string_ts_1.sqlUnescape)('raw');
            // @ts-expect-error
            (0, encoded_string_ts_1.shellUnescape)('raw');
        });
        (0, node_test_1.test)('simulate Windows shellEscape/unescape branch by temporarily overriding process.platform', function () {
            var origPlatform = process.platform;
            try {
                // override platform to win32 for the test (restore later)
                Object.defineProperty(process, 'platform', { value: 'win32' });
                var raw = "a \"quoted\" % and \\ backslash";
                var escaped = (0, encoded_string_ts_1.shellEscape)(raw);
                // Windows branch should wrap with double quotes
                node_assert_1.strict.equal(escaped[0], '"');
                node_assert_1.strict.equal(escaped[escaped.length - 1], '"');
                var un = (0, encoded_string_ts_1.shellUnescape)(escaped);
                node_assert_1.strict.equal(un, raw);
            }
            finally {
                // restore
                Object.defineProperty(process, 'platform', { value: origPlatform });
            }
        });
    });
};
/*

  TESTS

 */
for (var _i = 0, _a = [
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
]; _i < _a.length; _i++) {
    var c = _a[_i];
    _loop_1(c);
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
