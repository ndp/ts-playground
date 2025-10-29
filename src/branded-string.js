"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlEncode = urlEncode;
exports.urlDecode = urlDecode;
exports.base64encode = base64encode;
exports.base64decode = base64decode;
exports.sqlEscape = sqlEscape;
exports.sqlUnescape = sqlUnescape;
exports.htmlEscape = htmlEscape;
exports.htmlUnescape = htmlUnescape;
exports.shellEscape = shellEscape;
exports.shellUnescape = shellUnescape;
var node_assert_1 = require("node:assert");
var node_test_1 = require("node:test");
/*
Explicitly mark a string as having a given encoding. If the string already has an
encoding, the new encoding is added to the list.
 */
function encodedAs(s) {
    return s;
}
/*

FUNCTIONS

 */
function urlEncode(s) {
    return encodeURIComponent(s);
}
function urlDecode(encoded) {
    return decodeURIComponent(encoded);
}
function base64encode(raw) {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(raw, 'utf8').toString('base64');
    }
    var bytes = new TextEncoder().encode(raw);
    var bin = '';
    for (var i = 0; i < bytes.length; i++)
        bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
function base64decode(b64) {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(b64, 'base64').toString('utf8');
    }
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++)
        bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}
function sqlEscape(raw) {
    return raw
        .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            // case "\0":
            //     return "\\0";
            // case "\x08":
            //     return "\\b";
            // case "\x1a":
            //     return "\\z";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\" + char; // prepends a backslash to backslash, percent, and single/double quotes
        }
        return char;
    });
}
function sqlUnescape(escaped) {
    return escaped
        .replace(/\\([\0\x08\x09\x1a\n\r"'\\\%])/g, "$1");
}
function htmlEscape(raw) {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function htmlUnescape(escaped) {
    return escaped
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
function shellEscape(raw) {
    // Windows: wrap in double quotes and escape " \ and % (best-effort)
    if (typeof process !== 'undefined' && process.platform === 'win32') {
        var escaped_1 = '"' + raw.replace(/(["\\%])/g, '\\$1') + '"';
        return escaped_1;
    }
    // POSIX: wrap in single quotes and escape single quotes by '\'' sequence
    var escaped = "'" + raw.replace(/'/g, "'\\''") + "'";
    return escaped;
}
function shellUnescape(escaped) {
    if (typeof process !== 'undefined' && process.platform === 'win32') {
        // remove surrounding double quotes if present, then unescape backslash-escaped chars
        var s = String(escaped);
        if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
            var inner = s.slice(1, -1);
            return inner.replace(/\\(["\\%])/g, "$1");
        }
        return s.replace(/\\(["\\%])/g, "$1");
    }
    // POSIX: reverse the single-quote wrapping + '\'' sequences
    var str = String(escaped);
    if (str.length >= 2 && str[0] === "'" && str[str.length - 1] === "'") {
        var inner = str.slice(1, -1);
        return inner.replace(/'\\''/g, "'");
    }
    return str.replace(/'\\''/g, "'");
}
var _loop_1 = function (c) {
    (0, node_test_1.describe)("SmartStr transformations for text: \"".concat(c, "\""), function () {
        (0, node_test_1.test)('base64 encode/decode', function () {
            var b64 = base64encode(c);
            var decoded = base64decode(b64);
            node_assert_1.strict.equal(decoded, c);
        });
        (0, node_test_1.test)('url encode/decode', function () {
            var encoded = urlEncode(c);
            var decoded = urlDecode(encoded);
            node_assert_1.strict.equal(decoded, c);
        });
        (0, node_test_1.test)('shell escape/unescape', function () {
            var escaped = shellEscape(c);
            var unescaped = shellUnescape(escaped);
            node_assert_1.strict.equal(unescaped, c);
        });
        (0, node_test_1.test)('sql escape/unescape', function () {
            var escaped = sqlEscape(c);
            var unescaped = sqlUnescape(escaped);
            node_assert_1.strict.equal(unescaped, c);
        });
        (0, node_test_1.test)('html escape/unescape', function () {
            var escaped = htmlEscape(c);
            var unescaped = htmlUnescape(escaped);
            node_assert_1.strict.equal(unescaped, c);
        });
        (0, node_test_1.test)('url encode/decode error', function () {
            try {
                // @ts-expect-error
                urlDecode(c); // may blow up because it's not actually encoded
            }
            catch (URIError) {
            }
            try {
                var encoded = urlEncode(c);
                // @ts-expect-error
                urlDecode(urlDecode(encoded));
            }
            catch (URIError) {
            }
        });
        (0, node_test_1.test)('double encode/decode', function () {
            var encoded1 = urlEncode(c);
            var encoded2 = urlEncode(encoded1);
            var decoded1 = urlDecode(encoded2);
            var decoded2 = urlDecode(decoded1);
            node_assert_1.strict.equal(decoded2, c);
        });
        (0, node_test_1.test)('base64 + URL', function () {
            var urlReady = urlEncode(base64encode(c));
            var fromUrl = base64decode(urlDecode(urlReady));
            node_assert_1.strict.equal(fromUrl, c);
        });
    });
    (0, node_test_1.describe)('additional edge-case tests', function () {
        (0, node_test_1.test)('sql escape/unescape preserves NUL, control chars and percent', function () {
            var raw = '\0\x08\x09\x1a\n\r"\'\\%';
            var escaped = sqlEscape(raw);
            var unescaped = sqlUnescape(escaped);
            node_assert_1.strict.equal(unescaped, raw);
        });
        (0, node_test_1.test)('shell escape/unescape handles single quotes, backslashes, percent and double quotes', function () {
            var raw = "O'Reilly \\ % \"";
            var escaped = shellEscape(raw);
            var unescaped = shellUnescape(escaped);
            node_assert_1.strict.equal(unescaped, raw);
        });
        (0, node_test_1.test)('mixed encoding stack roundtrip (URL -> HTML -> base64 then reverse)', function () {
            var c = '<tag attr="x & y">Hello / world?</tag>';
            var b64 = base64encode(htmlEscape(urlEncode(c)));
            var html = base64decode(b64);
            var url = htmlUnescape(html);
            var decoded = urlDecode(url);
            node_assert_1.strict.equal(decoded, c);
        });
        (0, node_test_1.test)('shellUnescape on non-wrapped value is a no-op', function () {
            var plain = 'plain-string-with-\\-and-\'-chars';
            var out = shellUnescape(plain); // runtime check; ensure no crash and unchanged
            node_assert_1.strict.equal(out, plain);
        });
        (0, node_test_1.test)('TypeScript: calling unescape on raw strings should be a compile error', function () {
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
        (0, node_test_1.test)('simulate Windows shellEscape/unescape branch by temporarily overriding process.platform', function () {
            var origPlatform = process.platform;
            try {
                // override platform to win32 for the test (restore later)
                Object.defineProperty(process, 'platform', { value: 'win32' });
                var raw = "a \"quoted\" % and \\ backslash";
                var escaped = shellEscape(raw);
                // Windows branch should wrap with double quotes
                node_assert_1.strict.equal(escaped[0], '"');
                node_assert_1.strict.equal(escaped[escaped.length - 1], '"');
                var un = shellUnescape(escaped);
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
var ss2 = "";
var ss3 = "";
// AddEncoding
var ae0 = "";
var ae2 = ss2;
var ae3 = ss3;
var ae4 = ae3;
