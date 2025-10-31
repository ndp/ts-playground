import { base64encode, base64decode, htmlEscape, urlEncode } from './encoded-string';

const original = '<tag attr="x & y">Hello / world?</tag>';
const b64 = base64encode(htmlEscape(urlEncode(original)));

// The line below demonstrates the compiler error described:
// "Argument type string & { readonly _encoding: ['URL','HTML','base64'] } is not assignable to parameter type LastEncodedAs<'base64'>"
const decoded = base64decode(b64);

console.log(decoded);