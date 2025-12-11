import { strict as assert } from 'node:assert'
import { describe, test } from 'node:test'

import {
    base64encode, base64decode,
    htmlEscape, htmlUnescape,
    urlEncode, urlDecode,
    shellEscape, shellUnescape,
    sqlEscape, sqlUnescape,
    encodedAs
} from './encoded-string.ts'

const TEST_STRINGS = [
    '',
    ' ',
    '\t',
    '\r',
    '\n',
    "We're the 99%!",
    '<script>alert("Hello & goodbye!")</script>',
    'Multi-line text with © ® ™ symbols',
    'JSON: {"key": "value\'s \\"quote\\" marks"}',
    'Email: user+test@example.com',
    'base64 chars: +/=',
    'XML: <user role="admin">'
]

describe('Basic Encoding/Decoding', () => {
    TEST_STRINGS.forEach(input => {
        describe(`Input: "${input}"`, () => {
            test('base64', () => {
                assert.equal(base64decode(base64encode(input)), input)
            })

            test('url', () => {
                assert.equal(urlDecode(urlEncode(input)), input)
            })

            test('shell', () => {
                assert.equal(shellUnescape(shellEscape(input)), input)
            })

            test('sql', () => {
                assert.equal(sqlUnescape(sqlEscape(input)), input)
            })

            test('html', () => {
                assert.equal(htmlUnescape(htmlEscape(input)), input)
            })
        })
    })
})

describe('Edge Cases', () => {
    test('sql escaping preserves special characters', () => {
        const special = '\0\x08\x09\x1a\n\r"\'\\%'
        assert.equal(sqlUnescape(sqlEscape(special)), special)
    })

    test('shell escaping handles quotes and special chars', () => {
        const special = `O'Reilly \\ % "`
        assert.equal(shellUnescape(shellEscape(special)), special)
    })

    test('windows shell escaping', () => {
        const origPlatform = process.platform
        try {
            Object.defineProperty(process, 'platform', { value: 'win32' })
            const input = `a "quoted" % and \\ backslash`
            const escaped = shellEscape(input)
            assert.equal(escaped[0], '"')
            assert.equal(escaped[escaped.length - 1], '"')
            assert.equal(shellUnescape(escaped), input)
        } finally {
            Object.defineProperty(process, 'platform', { value: origPlatform })
        }
    })
})

describe('Multiple Encodings', () => {
    test('prevents double url encoding/decoding', () => {
        const input = 'test?param=value'
        const once = urlEncode(input)
        // @ts-expect-error
        const twice = urlEncode(once)
        assert.equal(urlDecode(urlDecode(twice)), input)
    })

    test('detects double encoding', () => {
        // user inputs some text
        const input = 'I <3 My Fiancé!'
        // we have a bug where special characters are entered, so ...
        const savedString = htmlEscape(input)
        // saved to database, time passes
        // to output to HTML, we are encouraged to "escape" it...
        const assign_to_innerHTML = htmlEscape(savedString)
    })

    test('base64 + url chain', () => {
        const input = 'test+data='
        const encoded = urlEncode(base64encode(input))
        assert.equal(base64decode(urlDecode(encoded)), input)
    })

    test('url -> html -> base64 chain', () => {
        const input = '<tag attr="x & y">Hello / world?</tag>'
        const encoded = base64encode(htmlEscape(urlEncode(input)))
        const decoded = urlDecode(htmlUnescape(base64decode(encoded)))
        assert.equal(decoded, input)
    })
})

describe('Type Safety', () => {
    test('compile-time type checks', () => {
        const plain = 'not-encoded'
        // @ts-expect-error - Cannot decode non-encoded string
        urlDecode(plain)
        // @ts-expect-error - Cannot decode non-encoded string
        base64decode(plain)
        // @ts-expect-error - Cannot unescape non-escaped string
        htmlUnescape(plain)
        // @ts-expect-error - Cannot unescape non-escaped string
        sqlUnescape(plain)
        // @ts-expect-error - Cannot unescape non-escaped string
        shellUnescape(plain)
    })

    test('encodedAs preserves typing', () => {
        const markup = encodedAs<'HTML'>('<div>&amp;</div>')
        // usage should still allow unescape when typed
        // @ts-expect-error - this is not plain string
        urlDecode(markup)
        // htmlUnescape should accept it at compile time when typed as HTML
        // no runtime assertion needed here; this is a compile-time intent
    })
})
