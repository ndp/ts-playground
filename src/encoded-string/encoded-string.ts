
type Encoding = 'URL' | 'base64' | 'HTML' | 'XML' | 'SQL' | 'Shell'
type EncodingSequence = Array<Encoding>

declare const _encoding: unique symbol;
export type EncodedString<E extends EncodingSequence = []> = string & { readonly [_encoding]: E };


type EncodingsOf<S extends string> = S extends EncodedString<infer T> ? T : []
type LastEncodingOf<S extends string> = Last<EncodingsOf<S>>
type PreviousEncodingOf<S extends string> = Pop<EncodingsOf<S>>
type AddEncoding<NewEncoding extends Encoding, ExistingStr extends string> =
    ExistingStr extends EncodedString<infer ExistingEncodings>
        ? EncodedString<Push<ExistingEncodings, NewEncoding>>
        : EncodedString<[NewEncoding]>;

// helper: S resolves to the passed EncodedString type only if its encoding tuple ends with E
type HasLast<S, E extends Encoding> = S extends EncodedString<infer T>
    ? T extends [...infer Rest, infer L]
        ? L extends E
            ? S
            : never
        : never
    : never

// helper: get the last encoding only if it is NOT E; otherwise never
type NotLast<S, E extends Encoding> = S extends EncodedString<infer T>
    ? T extends [...infer Rest, infer L]
        ? L extends E
            ? `Already encoded as ${L}`
            : S
        : S
    : S


/*
Explicitly mark a string as having a given encoding. If the string already has an
encoding, the new encoding is added to the list. This is just a type-caste disguised
as a function.
 */
export function encodedAs<NewEncoding extends Encoding, S extends string = string>(s: S) {
    return s as unknown as AddEncoding<NewEncoding, S>;
}


/*

FUNCTIONS

 */
export function urlEncode<S extends string>(s: NotLast<S, 'URL'>) {
    return encodeURIComponent(s) as AddEncoding<'URL', S>
}



// urlDecode: accept only strings whose last encoding is 'URL'
export function urlDecode<S extends EncodedString<EncodingSequence>>(encoded: HasLast<S, 'URL'>) {
    return decodeURIComponent(encoded as unknown as string) as unknown as EncodedString<PreviousEncodingOf<S>>;
}


export function base64encode<S extends string>(raw: NotLast<S, 'base64'>) {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(raw, 'utf8').toString('base64') as AddEncoding<'base64', S>;
    }
    const bytes = new TextEncoder().encode(raw);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin) as AddEncoding<'base64', S>;
}


// base64decode: accept only strings whose last encoding is 'base64'
export function base64decode<S extends EncodedString<EncodingSequence>>(b64: HasLast<S, 'base64'>) {
    if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
        return Buffer.from(b64 as unknown as string, 'base64').toString('utf8') as unknown as EncodedString<PreviousEncodingOf<S>>;
    }
    const bin = atob(b64 as unknown as string);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes) as unknown as EncodedString<PreviousEncodingOf<S>>;
}

export function sqlEscape<S extends string>(raw: NotLast<S, 'SQL'>) {
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

// sqlUnescape: accept only strings whose last encoding is 'SQL'
export function sqlUnescape<S extends EncodedString<EncodingSequence>>(escaped: HasLast<S, 'SQL'>) {
    return (escaped as unknown as string)
        .replace(/\\([\0\x08\x09\x1a\n\r"'\\\%])/g, "$1") as unknown as EncodedString<PreviousEncodingOf<S>>;
}



export function htmlEscape<S extends string>(raw: NotLast<S, 'HTML'>) {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;') as AddEncoding<'HTML', S>;
}


// htmlUnescape: accept only strings whose last encoding is 'HTML'
export function htmlUnescape<S extends EncodedString<EncodingSequence>>(escaped: HasLast<S, 'HTML'>) {
    return (escaped as unknown as string)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'") as unknown as EncodedString<PreviousEncodingOf<S>>;
}

export function shellEscape<S extends string>(raw: NotLast<S, 'Shell'>) {
    // Windows: wrap in double quotes and escape " \ and % (best-effort)
    if (typeof process !== 'undefined' && process.platform === 'win32') {
        const escaped = '"' + raw.replace(/(["\\%])/g, '\\$1') + '"';
        return escaped as AddEncoding<'Shell', S>;
    }
    // POSIX: wrap in single quotes and escape single quotes by '\'' sequence
    const escaped = "'" + raw.replace(/'/g, "'\\''") + "'";
    return escaped as AddEncoding<'Shell', S>;
}

// shellUnescape: accept only strings whose last encoding is 'Shell'
export function shellUnescape<S extends EncodedString<EncodingSequence>>(escaped: HasLast<S, 'Shell'>) {
    if (typeof process !== 'undefined' && process.platform === 'win32') {
        const s = String(escaped);
        if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
            const inner = s.slice(1, -1);
            return inner.replace(/\\(["\\%])/g, "$1") as unknown as EncodedString<PreviousEncodingOf<S>>;
        }
        return s.replace(/\\(["\\%])/g, "$1") as unknown as EncodedString<PreviousEncodingOf<S>>;
    }
    const str = String(escaped);
    if (str.length >= 2 && str[0] === "'" && str[str.length - 1] === "'") {
        const inner = str.slice(1, -1);
        return inner.replace(/'\\''/g, "'") as unknown as EncodedString<PreviousEncodingOf<S>>;
    }
    return str.replace(/'\\''/g, "'") as unknown as EncodedString<PreviousEncodingOf<S>>;
}



type Pop<T extends Encoding[]> = T extends [...infer U, Encoding] ? U : never
type Push<T extends Encoding[], U> = [...T, U]
type Last<T extends Encoding[]> = T extends [...any, infer L]
    ? L extends Encoding
        ? L
        : never
    : never;
