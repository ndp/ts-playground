"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodedAs = encodedAs;
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
/*
Explicitly mark a string as having a given encoding. If the string already has an
encoding, the new encoding is added to the list. This is just a type-caste disguised
as a function.
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
// urlDecode: accept only strings whose last encoding is 'URL'
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
// base64decode: accept only strings whose last encoding is 'base64'
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
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\" + char; // prepends a backslash to backslash, percent, and single/double quotes
        }
        return char;
    });
}
// sqlUnescape: accept only strings whose last encoding is 'SQL'
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
// htmlUnescape: accept only strings whose last encoding is 'HTML'
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
// shellUnescape: accept only strings whose last encoding is 'Shell'
function shellUnescape(escaped) {
    if (typeof process !== 'undefined' && process.platform === 'win32') {
        var s = String(escaped);
        if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
            var inner = s.slice(1, -1);
            return inner.replace(/\\(["\\%])/g, "$1");
        }
        return s.replace(/\\(["\\%])/g, "$1");
    }
    var str = String(escaped);
    if (str.length >= 2 && str[0] === "'" && str[str.length - 1] === "'") {
        var inner = str.slice(1, -1);
        return inner.replace(/'\\''/g, "'");
    }
    return str.replace(/'\\''/g, "'");
}
