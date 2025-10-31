# Encoded String Type System

A TypeScript library for safely handling string encodings through type-level tracking. Prevents accidental
double-encoding and ensures proper decode order.

## Features

- Type-safe encoding/decoding for:
    - URL encoding
    - Base64
    - HTML entities
    - SQL escaping
    - Shell escaping (Windows/POSIX)
- Compile-time tracking of multiple encodings
- Proper decode order enforcement
- Cross-platform support (Node.js and browser)

## Usage

```typescript
import { urlEncode, base64encode, htmlEscape } from './encoded-string'

// Simple encoding
const escaped = htmlEscape('<div>') // Type: EncodedString<['HTML']>

// Multiple encodings tracked in order
const data = base64encode(htmlEscape(urlEncode('a & b')))
// Type: EncodedString<['URL', 'HTML', 'base64']>

// Decode must match last encoding
base64decode(data) // OK
urlDecode(data)    // Type Error: Expected 'base64' as last encoding

// Manual encoding assertion
import { encodedAs } from './encoded-string'
const known = encodedAs<'HTML'>('<div>&amp;</div>') 
```

## API
### Encoding Functions
  - `urlEncode(s: string)`
  - `base64encode(s: string)`
  - `htmlEscape(s: string)`
  - `sqlEscape(s: string)`
  - `shellEscape(s: string)`
### Decoding Functions
  - `urlDecode(s: HasLast<S, 'URL'>)`
  - `base64decode(s: HasLast<S, 'base64'>)`
  - `htmlUnescape(s: HasLast<S, 'HTML'>)`
  - `sqlUnescape(s: HasLast<S, 'SQL'>)`
  - `shellUnescape(s: HasLast<S, 'Shell'>)`
### Type Utilities
  - `encodedAs<E>(s: string)` - Manually assert encoding
  - `EncodedString<E>` - String with encoding history
### Platform Support
Browser, Node.js and Windows & POSIX shell escaping