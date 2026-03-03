import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/parser.ts'
import {readFileSync} from 'fs'

describe('parse: comments → prose', () => {

  test('single line comment becomes prose', () => {
    const nodes = parse('// Hello world')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'Hello world' }
    ])
  })

  test('multiple consecutive line comments merge into one prose node', () => {
    const nodes = parse('// Hello\n// world')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'Hello\nworld' }
    ])
  })

  test('blank // line becomes blank line in prose', () => {
    const nodes = parse('// First\n//\n// Second')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'First\n\nSecond' }
    ])
  })

  test('block comment becomes prose', () => {
    const nodes = parse('/* Hello world */')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'Hello world' }
    ])
  })

  test('multi-line block comment strips leading asterisks', () => {
    const nodes = parse('/*\n * ## Usage\n *\n * A description.\n */')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: '## Usage\n\nA description.' }
    ])
  })

  test('empty file produces no nodes', () => {
    const nodes = parse('')
    assert.deepEqual(nodes, [])
  })

  test('blank uncommented line between two comment blocks → two separate prose nodes', () => {
    const nodes = parse('// First paragraph.\n\n// Second paragraph.')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'First paragraph.' },
      { kind: 'prose', text: 'Second paragraph.' }
    ])
  })

  test('no blank line between comment blocks → merged into one prose node', () => {
    const nodes = parse('// First line.\n// Second line.')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'First line.\nSecond line.' }
    ])
  })

  test('multiple blank lines between comment blocks → still two prose nodes', () => {
    const nodes = parse('// First.\n\n\n// Second.')
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'First.' },
      { kind: 'prose', text: 'Second.' }
    ])
  })

})

describe('parse: test() with no body statements produces no code node', () => {
  test('empty test body', () => {
    const nodes = parse(`
import { test } from 'node:test'
test('empty', () => {})
`)
    assert.deepEqual(nodes, [])
  })
})

describe('parse: test() → code block', () => {

  test('test() body becomes a code node', () => {
    const nodes = parse(`
import { test } from 'node:test'
test('example', () => {
  const x = 1
})
`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: 'const x = 1', title: undefined }
    ])
  })

  test('test() body with multiple statements is dedented', () => {    const nodes = parse(`
import { test } from 'node:test'
test('example', () => {
  const a = 1
  const b = 2
})
`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: 'const a = 1\nconst b = 2', title: undefined }
    ])
  })

})

describe('parse: describe() transparency', () => {

  test('describe wrapper is transparent — code inside is still extracted', () => {
    const nodes = parse(`
import { describe, test } from 'node:test'
describe('group', () => {
  test('inner', () => {
    const x = 42
  })
})
`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: 'const x = 42', title: undefined }
    ])
  })

  test('describe name is discarded', () => {
    const nodes = parse(`
import { describe, test } from 'node:test'
describe('My Group', () => {
  test('t', () => { const x = 1 })
})
`)
    // no node should contain the describe name
    assert.ok(!JSON.stringify(nodes).includes('My Group'))
  })

  test('prose comments between tests inside describe are captured', () => {
    const nodes = parse(`
import { describe, test } from 'node:test'
describe('group', () => {
  // before second test
  test('second', () => {
    const y = 2
  })
})
`)
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'before second test' },
      { kind: 'code', lang: 'typescript', text: 'const y = 2', title: undefined }
    ])
  })

  test('nested describe is transparent', () => {
    const nodes = parse(`
import { describe, test } from 'node:test'
describe('outer', () => {
  describe('inner', () => {
    test('deep', () => {
      const z = 3
    })
  })
})
`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: 'const z = 3', title: undefined }
    ])
  })

})



describe('parse: import filtering', () => {

  test('import without "// keep" is hidden', () => {
    const nodes = parse(`import { foo } from './foo.ts'`)
    assert.deepEqual(nodes, [])
  })

  test('import with "// keep" becomes a code node', () => {
    const nodes = parse(`import { foo } from './foo.ts' // keep`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: `import { foo } from './foo.ts' // keep`, title: undefined }
    ])
  })

  test('multiple "kept imports" become one code node', () => {
    const nodes = parse(
      `import { foo } from './foo.ts' // keep\nimport { bar } from './bar.ts' // keep`
    )
    assert.deepEqual(nodes, [
      {
        kind: 'code',
        lang: 'typescript',
        text: `import { foo } from './foo.ts' // keep\nimport { bar } from './bar.ts' // keep`,
        title: undefined
      }
    ])
  })

  test('mixed: only kept imports appear', () => {
    const nodes = parse(
      `import { test } from 'node:test'\nimport { foo } from './foo.ts' // keep`
    )
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: `import { foo } from './foo.ts' // keep`, title: undefined }
    ])
  })

})

describe('parse: code block merge (comment fence + test body)', () => {

  test('comment ending with code fence merges with next test body', () => {
    const nodes = parse(`
import { test } from 'node:test'
import { encode } from './encoder.ts'
// Here is how to use it:
//
// \`\`\`ts
// import { encode } from './encoder.ts'
// \`\`\`
test('basic', () => {
  const r = encode('hi')
})
`)
    // should produce: prose + one merged code block
    const prose = nodes.find(n => n.kind === 'prose') as any
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(nodes.length, 2)
    assert.ok(prose.text.includes('Here is how to use it'))
    assert.ok(code.text.includes("import { encode } from './encoder.ts'"))
    assert.ok(code.text.includes("const r = encode('hi')"))
  })

  test('comment NOT ending with code fence does not merge', () => {
    const nodes = parse(`
import { test } from 'node:test'
// Just some prose
test('basic', () => {
  const r = 1
})
`)
    assert.equal(nodes.length, 2)
    assert.equal(nodes[0]!.kind, 'prose')
    assert.equal(nodes[1]!.kind, 'code')
    // The code block should NOT contain the prose
    assert.ok(!(nodes[1] as any).text.includes('Just some prose'))
  })

})

describe('parse: // file: filename label', () => {

  test('// file: before test() sets title on that code block', () => {
    const nodes = parse(`
import { test } from 'node:test'
// file: my-example.ts
test('basic', () => {
  const x = 1
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.title, 'my-example.ts')
  })

  test('// file: does not appear in prose', () => {
    const nodes = parse(`
import { test } from 'node:test'
// file: my-example.ts
test('basic', () => {
  const x = 1
})
`)
    const prose = nodes.find(n => n.kind === 'prose')
    assert.equal(prose, undefined)
  })

  test('// file: before a kept import sets title on that code block', () => {
    const nodes = parse(
      `// file: header.ts\nimport { foo } from './foo.ts' // keep`
    )
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.title, 'header.ts')
  })

})

describe('parse: full document model (fixture)', () => {

  test('parses the encoder fixture into correct node sequence', async () => {
    const src = readFileSync(
      new URL('./fixtures/encoder/README.ts', import.meta.url),
      'utf8'
    )
    const nodes = parse(src)

    // Should start with prose (the # Encoder heading)
    assert.equal(nodes[0]?.kind, 'prose')
    assert.ok((nodes[0] as any).text.startsWith('# Encoder'))

    // Should have a kept import code block
    const importNode = nodes.find(n => n.kind === 'code' && (n as any).text.includes('encoder.ts'))
    assert.ok(importNode, 'should have kept import code block')

    // Should have the merged code block with // keep import + test body
    const mergedNode = nodes.find(n =>
      n.kind === 'code' &&
      (n as any).text.includes("import { encode }") &&
      (n as any).text.includes("encode('hello')")
    )
    assert.ok(mergedNode, 'should have merged code block')
    assert.equal((mergedNode as any).title, 'encode-example.ts')

    // Should have the round-trip test code
    const roundTripNode = nodes.find(n =>
      n.kind === 'code' && (n as any).text.includes('decode(encode')
    )
    assert.ok(roundTripNode, 'should have round-trip test code')

    // Should end with prose containing the illustrative code fence
    const lastNode = nodes[nodes.length - 1]
    assert.equal(lastNode?.kind, 'prose')
    assert.ok((lastNode as any).text.includes('```ts'))
  })

})

describe('parse: assertion rewriting', () => {

  test('assert.equal(a, b) → a // => b', () => {
    const nodes = parse(`
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('t', () => {
  const result = compute()
  assert.equal(result, 42)
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.text, "const result = compute()\nresult // => 42")
  })

  test('assert.deepEqual(a, b) single-line → a // => b', () => {
    const nodes = parse(`
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('t', () => {
  assert.deepEqual(arr, [1, 2, 3])
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.text, "arr // => [1, 2, 3]")
  })

  test('assert.deepEqual(a, b) multi-line → preserves formatting as comment lines', () => {
    const nodes = parse(`
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('t', () => {
  assert.deepEqual(nodes, [
    { kind: 'prose' }
  ])
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.text, "nodes // => [\n//   { kind: 'prose' }\n// ]")
  })

  test('assert.notEqual(a, b) → a // != b', () => {
    const nodes = parse(`
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('t', () => {
  assert.notEqual(x, null)
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.text, "x // != null")
  })

  test('assert.throws(() => expr, pattern) → expr // throws pattern', () => {
    const nodes = parse(`
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('t', () => {
  assert.throws(() => riskyFn(), /expected error/)
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.text, "riskyFn() // throws /expected error/")
  })

  test('assert.throws(() => expr) with no pattern → expr // throws', () => {
    const nodes = parse(`
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('t', () => {
  assert.throws(() => riskyFn())
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.text, "riskyFn() // throws")
  })

  test('assert.ok at statement level is dropped', () => {
    const nodes = parse(`
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('t', () => {
  const result = check()
  assert.ok(result)
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.equal(code?.text, "const result = check()")
  })

  test('assert.ok nested in callback body is transformed to expr // OK', () => {
    const nodes = parse(`
import { test } from 'node:test'
import assert from 'node:assert/strict'
test('t', () => {
  const x = new ComponentBwilder()
    .wAfterUpdateFn(function() {
      assert.ok(subElements)
    })
})
`)
    const code = nodes.find(n => n.kind === 'code') as any
    assert.ok(code?.text.includes('subElements // OK'))
    assert.ok(!code?.text.includes('assert.ok'))
  })

})

describe('parse: shell`` tagged template → sh code block', () => {

  test('bare shell template → sh CodeNode', () => {
    const nodes = parse('shell`cat "foo.txt"`')
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'cat "foo.txt"', title: undefined }
    ])
  })

  test('shell template with # => annotation → preserved in code text', () => {
    const nodes = parse('shell`\n  sort input.txt\n  # => apple\n`')
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt\n# => apple', title: undefined }
    ])
  })

  test('shell template with # file: annotation → preserved in code text', () => {
    const nodes = parse('shell`\n  sort input.txt\n  # file: output.txt contains "line one"\n`')
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt\n# file: output.txt contains "line one"', title: undefined }
    ])
  })

})

describe('parse: shellExample() → sh code block', () => {

  test('shellExample call with empty options → sh CodeNode', () => {
    const nodes = parse(`shellExample('echo "hello"', {})`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'echo "hello"', title: undefined }
    ])
  })

  test('shellExample with stdout option → # => annotation in code text', () => {
    const nodes = parse(`shellExample('sort input.txt', { stdout: 'apple' })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt\n# => apple', title: undefined }
    ])
  })

  test('shellExample with short single-line outputFiles contains → separate prose node', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: '# My Lib' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt', title: undefined },
      { kind: 'prose', text: 'Output file `output.txt` contains "# My Lib"', terminal: true }
    ])
  })

  test('shellExample with long single-line outputFiles contains → prose + code block', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: 'This is a rather long expected string that exceeds sixty chars' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt', title: undefined },
      { kind: 'prose', text: 'Output file `output.txt` contains:', terminal: true },
      { kind: 'code', lang: 'text', text: 'This is a rather long expected string that exceeds sixty chars', title: undefined }
    ])
  })

  test('shellExample with multi-line outputFiles contains → prose + code block', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: '# Title\\n\\nBody.' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt', title: undefined },
      { kind: 'prose', text: 'Output file `output.txt` contains:', terminal: true },
      { kind: 'code', lang: 'text', text: '# Title\n\nBody.', title: undefined }
    ])
  })

  test('shellExample with outputFiles matches → separate prose node', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', matches: /## How it works/ }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt', title: undefined },
      { kind: 'prose', text: 'Output file `output.txt` matches `/## How it works/`', terminal: true }
    ])
  })

  test('shellExample with single-line inputFiles → inline comment in code text', () => {
    const nodes = parse(`shellExample('node cli.ts tmp.ts', { inputFiles: [{ path: 'tmp.ts', content: '// Hello, world!' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// Input file "tmp.ts":\n// Hello, world!', title: 'tmp.ts' },
      { kind: 'code', lang: 'sh', text: 'node cli.ts tmp.ts\n# Input file `tmp.ts` contains `// Hello, world!`', title: undefined }
    ])
  })

  test('shellExample with multi-line inputFiles → separate code block before sh block', () => {
    const nodes = parse(`shellExample('node cli.ts tmp.ts', { inputFiles: [{ path: 'tmp.ts', content: '// Line 1\\n// Line 2' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// Input file "tmp.ts":\n// Line 1\n// Line 2', title: 'tmp.ts' },
      { kind: 'code', lang: 'sh', text: 'node cli.ts tmp.ts', title: undefined }
    ])
  })

  test('shellExample with JSON input file → prose label before code block', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'config.json', content: '{ }' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'With input file `config.json`:', noBlankAfter: true },
      { kind: 'code', lang: 'json', text: '{ }', title: 'config.json' },
      { kind: 'code', lang: 'sh', text: 'node cli.ts', title: undefined }
    ])
  })

  test('shellExample with multiple inputFiles mixed single and multi-line', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'config.json', content: '{  }' }, { path: 'main.ts', content: '// Line 1\\n// Line 2\\n// Line 3' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'With input file `config.json`:', noBlankAfter: true },
      { kind: 'code', lang: 'json', text: '{  }', title: 'config.json' },
      { kind: 'code', lang: 'typescript', text: '// Input file "main.ts":\n// Line 1\n// Line 2\n// Line 3', title: 'main.ts' },
      { kind: 'code', lang: 'sh', text: 'node cli.ts', title: undefined }
    ])
  })

})
