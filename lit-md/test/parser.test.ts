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
      { kind: 'code', lang: 'typescript', text: 'const x = 1'}
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
      { kind: 'code', lang: 'typescript', text: 'const a = 1\nconst b = 2'}
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
      { kind: 'code', lang: 'typescript', text: 'const x = 42'}
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
      { kind: 'code', lang: 'typescript', text: 'const y = 2'}
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
      { kind: 'code', lang: 'typescript', text: 'const z = 3'}
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
      { kind: 'code', lang: 'typescript', text: `import { foo } from './foo.ts'`}
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
        text: `import { foo } from './foo.ts'\nimport { bar } from './bar.ts'`,
      }
    ])
  })

  test('mixed: only kept imports appear', () => {
    const nodes = parse(
      `import { test } from 'node:test'\nimport { foo } from './foo.ts' // keep`
    )
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: `import { foo } from './foo.ts'`}
    ])
  })

  test('// keep on variable declaration keeps it', () => {
    const nodes = parse(
      `const CONFIG = { timeout: 5000 } // keep`
    )
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: `const CONFIG = { timeout: 5000 }`}
    ])
  })

  test('// keep on type alias keeps it', () => {
    const nodes = parse(
      `type Alias = string // keep`
    )
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: `type Alias = string`}
    ])
  })

  test('multiple statements with // keep are merged', () => {
    const nodes = parse(
      `const CONFIG = { timeout: 5000 } // keep\ntype Alias = string // keep`
    )
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: `const CONFIG = { timeout: 5000 }\ntype Alias = string`}
    ])
  })

  test('// keep with test body creates separate code blocks (for now)', () => {
    const nodes = parse(
      `import { test } from 'node:test'\nconst CONFIG = { x: 1 } // keep\ntest('example', () => {\n  const y = 1\n})`
    )
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: `const CONFIG = { x: 1 }` },
      { kind: 'code', lang: 'typescript', text: `const y = 1`}
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
    assert.equal(code?.text, "nodes // => [\n      //   { kind: 'prose' }\n      // ]")
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
      { kind: 'code', lang: 'sh', text: 'cat "foo.txt"'}
    ])
  })

  test('shell template with # => annotation → preserved in code text', () => {
    const nodes = parse('shell`\n  sort input.txt\n  # => apple\n`')
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt\n# => apple'}
    ])
  })

  test('shell template with # file: annotation → preserved in code text', () => {
    const nodes = parse('shell`\n  sort input.txt\n  # file: output.txt contains "line one"\n`')
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'sort input.txt\n# file: output.txt contains "line one"'}
    ])
  })

})

describe('parse: shellExample() → sh code block', () => {

  test('shellExample call with empty options → sh CodeNode', () => {
    const nodes = parse(`shellExample('echo "hello"', {})`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ echo "hello"'}
    ])
  })

  test('shellExample with stdout option → raw output in code text', () => {
    const nodes = parse(`shellExample('sort input.txt', { stdout: { contains: 'apple' } })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt\napple'}
    ])
  })

  test('shellExample with stdout display: true → executes command and displays output', () => {
    const nodes = parse(`shellExample('echo "hello world"', { stdout: { contains: 'hello', display: true } })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ echo "hello world"\nhello world'}
    ])
  })

  test('shellExample with stdout display: true and inputFiles → uses input files in execution', () => {
    const nodes = parse(`
      shellExample('sort data.txt', {
        inputFiles: [{ path: 'data.txt', content: 'cherry\\napple\\nbanana' }],
        stdout: { contains: 'apple', display: true }
      })
    `)
    // Multi-line inputFiles generate a prose label and code block first
    assert.equal(nodes.length, 3)
    assert.deepEqual(nodes[0], { kind: 'prose', text: 'With input file `data.txt`:', noBlankAfter: true })
    assert.equal(nodes[1]?.kind, 'code')
    assert.equal(nodes[2]?.kind, 'code')
    assert.equal(nodes[2]?.lang, 'sh')
    const shellText = nodes[2]?.text ?? ''
    assert.ok(shellText.includes('$ sort data.txt'))
    assert.ok(shellText.includes('apple'))
  })

  test('shellExample with stdout display: false → does not execute', () => {
    const nodes = parse(`shellExample('echo "hello"', { stdout: { contains: 'hello', display: false } })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ echo "hello"\nhello'}
    ])
  })

  test('shellExample with short single-line outputFiles contains → prose node + display node', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: '# My Lib' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'prose', text: 'Output file `output.txt` contains `# My Lib`.', terminal: true },
      { kind: 'output-file-display', path: 'output.txt', lang: 'text', cmd: 'sort input.txt', inputFiles: [] }
    ])
  })

  test('shellExample with long single-line outputFiles contains → truncated prose + display node', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: 'This is a rather long expected string that exceeds sixty chars' }] })`)
    assert.equal(nodes.length, 3)
    assert.deepEqual(nodes[0], { kind: 'code', lang: 'sh', text: '$ sort input.txt'})
    assert.deepEqual(nodes[1], { kind: 'prose', text: 'Output file `output.txt` contains This is a rather long expected string that exceeds sixty cha....', terminal: true })
    assert.equal(nodes[2]?.kind, 'output-file-display')
    const displayNode = nodes[2] as any
    assert.equal(displayNode.path, 'output.txt')
    assert.ok(displayNode.execution, 'should have execution for long string')
  })

  test('shellExample with multi-line outputFiles contains → prose + excerpt code block, no display node', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: '# Title\\n\\nBody.' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'prose', text: 'Output file `output.txt` contains # Title...:', terminal: true, noBlankAfter: true },
      { kind: 'code', lang: 'text', text: '...\n# Title\n\nBody.\n...'}
    ])
  })

  test('shellExample with outputFiles matches → prose node + display node', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', matches: /## How it works/ }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'prose', text: 'Output file `output.txt` matches `/## How it works/`.', terminal: true },
      { kind: 'output-file-display', path: 'output.txt', lang: 'text', cmd: 'sort input.txt', inputFiles: [] }
    ])
  })

  test('shellExample with outputFiles display:none → prose node only, no display node', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: '# My Lib', display: 'none' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'prose', text: 'Output file `output.txt` contains `# My Lib`.', terminal: true }
    ])
  })

  test('shellExample with inputFiles captures them in display node', () => {
    const nodes = parse(`shellExample('cp a.txt b.txt', { inputFiles: [{ path: 'a.txt', content: 'hello' }], outputFiles: [{ path: 'b.txt', contains: 'hello' }] })`)
    const displayNode = nodes.find(n => n.kind === 'output-file-display') as any
    assert.ok(displayNode, 'should have output-file-display node')
    assert.deepEqual(displayNode.inputFiles, [{ path: 'a.txt', content: 'hello' }])
    assert.equal(displayNode.cmd, 'cp a.txt b.txt')
  })

  test('shellExample with single-line inputFiles → inline comment in code text', () => {
    const nodes = parse(`shellExample('node cli.ts tmp.ts', { inputFiles: [{ path: 'tmp.ts', content: '// Hello, world!' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// Input file "tmp.ts":\n// Hello, world!' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts tmp.ts\n# Input file `tmp.ts` contains `// Hello, world!`'}
    ])
  })

  test('shellExample with multi-line inputFiles → separate code block before sh block', () => {
    const nodes = parse(`shellExample('node cli.ts tmp.ts', { inputFiles: [{ path: 'tmp.ts', content: '// Line 1\\n// Line 2' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// Input file "tmp.ts":\n// Line 1\n// Line 2' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts tmp.ts'}
    ])
  })

  test('shellExample with JSON input file → prose label before code block', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'config.json', content: '{ }' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'With input file `config.json`:', noBlankAfter: true },
      { kind: 'code', lang: 'json', text: '{ }' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts'}
    ])
  })

  test('shellExample with multiple inputFiles mixed single and multi-line', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'config.json', content: '{  }' }, { path: 'main.ts', content: '// Line 1\\n// Line 2\\n// Line 3' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'With input file `config.json`:', noBlankAfter: true },
      { kind: 'code', lang: 'json', text: '{  }' },
      { kind: 'code', lang: 'typescript', text: '// Input file "main.ts":\n// Line 1\n// Line 2\n// Line 3' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts'}
    ])
  })

  test('shellExample with displayCommand: true → shows command (explicit)', () => {
    const nodes = parse(`shellExample('echo "hello"', { displayCommand: true })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ echo "hello"'}
    ])
  })

  test('shellExample with displayCommand: false → hides command and omits code block when no annotations', () => {
    const nodes = parse(`shellExample('echo "hello"', { displayCommand: false })`)
    assert.deepEqual(nodes, [])
  })

  test('shellExample with displayCommand: "hidden" → hides command and omits code block when no annotations', () => {
    const nodes = parse(`shellExample('echo "hello"', { displayCommand: 'hidden' })`)
    assert.deepEqual(nodes, [])
  })

  test('shellExample with displayCommand: false and stdout → shows only stdout, no command', () => {
    const nodes = parse(`shellExample('sort input.txt', { displayCommand: false, stdout: { contains: 'apple' } })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: 'apple'}
    ])
  })

  test('shellExample with displayCommand: "hidden" and outputFiles → hides command but shows output assertion', () => {
    const nodes = parse(`shellExample('sort input.txt', { displayCommand: 'hidden', outputFiles: [{ path: 'output.txt', contains: '# My Lib' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'prose', text: 'Output file `output.txt` contains `# My Lib`.', terminal: true },
      { kind: 'output-file-display', path: 'output.txt', lang: 'text', cmd: 'sort input.txt', inputFiles: [] }
    ])
  })

  test('shellExample with inputFiles displayPath: false → hides file name, shows only content', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'tmp.ts', content: '// Hello', displayPath: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// Hello' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts'}
    ])
  })

  test('shellExample with inputFiles displayPath: "hidden" → hides file name', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'tmp.ts', content: '// Line 1\\n// Line 2', displayPath: 'hidden' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// Line 1\n// Line 2' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts'}
    ])
  })

  test('shellExample with outputFiles displayPath: false → hides file name in prose', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: 'hello', displayPath: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'prose', text: 'Contains `hello`.', terminal: true },
      { kind: 'output-file-display', path: 'output.txt', lang: 'text', cmd: 'sort input.txt', inputFiles: [] }
    ])
  })

  test('shellExample with outputFiles displayPath: "hidden" and matches → hides file name', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', matches: /hello/, displayPath: 'hidden' }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'prose', text: 'Matches `/hello/`.', terminal: true },
      { kind: 'output-file-display', path: 'output.txt', lang: 'text', cmd: 'sort input.txt', inputFiles: [] }
    ])
  })

  test('shellExample with outputFiles displayPath: false, long contains → hides file name, shows truncated content', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: 'This is a very long string that definitely exceeds the sixty character limit', displayPath: false }] })`)
    assert.equal(nodes.length, 3)
    assert.deepEqual(nodes[0], { kind: 'code', lang: 'sh', text: '$ sort input.txt'})
    assert.deepEqual(nodes[1], { kind: 'prose', text: 'Contains This is a very long string that definitely exceeds the sixty....', terminal: true })
    assert.equal(nodes[2]?.kind, 'output-file-display')
    const displayNode = nodes[2] as any
    assert.ok(displayNode.execution, 'should have execution for long string')
  })

  test('shellExample with mixed inputFiles displayPath values → respects each setting', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'a.ts', content: '// A', displayPath: true }, { path: 'b.ts', content: '// B', displayPath: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// Input file "a.ts":\n// A' },
      { kind: 'code', lang: 'typescript', text: '// B' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts\n# Input file `a.ts` contains `// A`'}
    ])
  })

  test('shellExample with inputFiles summary: false → hides summary label', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'a.ts', content: '// A', summary: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// A' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts'}
    ])
  })

  test('shellExample with mixed inputFiles summary values → respects each setting', () => {
    const nodes = parse(`shellExample('node cli.ts', { inputFiles: [{ path: 'a.ts', content: '// A', summary: true }, { path: 'b.ts', content: '// B', summary: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'typescript', text: '// Input file "a.ts":\n// A' },
      { kind: 'code', lang: 'typescript', text: '// B' },
      { kind: 'code', lang: 'sh', text: '$ node cli.ts\n# Input file `a.ts` contains `// A`'}
    ])
  })

  test('shellExample with outputFiles summary: false (contains) → hides summary, shows display', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: 'hello', summary: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'output-file-display', path: 'output.txt', lang: 'text', cmd: 'sort input.txt', inputFiles: [] }
    ])
  })

  test('shellExample with outputFiles summary: false (matches) → hides summary, shows display', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', matches: /hello/, summary: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'output-file-display', path: 'output.txt', lang: 'text', cmd: 'sort input.txt', inputFiles: [] }
    ])
  })

  test('shellExample with outputFiles summary: false (no contains/matches) → hides summary, shows display', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', summary: false }] })`)
    assert.equal(nodes.length, 2)
    assert.deepEqual(nodes[0], { kind: 'code', lang: 'sh', text: '$ sort input.txt'})
    assert.equal(nodes[1]?.kind, 'output-file-display')
    const displayNode = nodes[1] as any
    assert.ok(displayNode.execution, 'should have execution when no contains/matches')
  })

  test('shellExample with outputFiles summary: false (multi-line contains) → hides summary, shows code excerpt', () => {
    const nodes = parse(`shellExample('sort input.txt', { outputFiles: [{ path: 'output.txt', contains: 'Line 1\\nLine 2', summary: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ sort input.txt'},
      { kind: 'code', lang: 'text', text: '...\nLine 1\nLine 2\n...'}
    ])
  })

  test('shellExample with mixed outputFiles summary values → respects each setting', () => {
    const nodes = parse(`shellExample('cmd', { outputFiles: [{ path: 'a.txt', contains: 'hello', summary: true }, { path: 'b.txt', contains: 'world', summary: false }] })`)
    assert.deepEqual(nodes, [
      { kind: 'code', lang: 'sh', text: '$ cmd'},
      { kind: 'prose', text: 'Output file `a.txt` contains `hello`.', terminal: true },
      { kind: 'output-file-display', path: 'a.txt', lang: 'text', cmd: 'cmd', inputFiles: [] },
      { kind: 'output-file-display', path: 'b.txt', lang: 'text', cmd: 'cmd', inputFiles: [] }
    ])
  })

})
