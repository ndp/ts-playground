import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { render } from './renderer.ts'
import type { DocNode } from './parser.ts'

describe('render: markdown output', () => {

  test('prose node is emitted verbatim', () => {
    const nodes: DocNode[] = [{ kind: 'prose', text: '# Hello\n\nWorld.' }]
    assert.equal(render(nodes), '# Hello\n\nWorld.')
  })

  test('code node is wrapped in a fenced block', () => {
    const nodes: DocNode[] = [
      { kind: 'code', lang: 'typescript', text: 'const x = 1', title: undefined }
    ]
    assert.equal(render(nodes), '```typescript\nconst x = 1\n```')
  })

  test('code node with title includes title in fence info string', () => {
    const nodes: DocNode[] = [
      { kind: 'code', lang: 'typescript', text: 'const x = 1', title: 'example.ts' }
    ]
    assert.equal(render(nodes), '```typescript example.ts\nconst x = 1\n```')
  })

  test('prose followed by code has blank line between them', () => {
    const nodes: DocNode[] = [
      { kind: 'prose', text: 'Some prose.' },
      { kind: 'code', lang: 'typescript', text: 'const x = 1', title: undefined }
    ]
    assert.equal(render(nodes), 'Some prose.\n\n```typescript\nconst x = 1\n```')
  })

  test('code followed by prose has blank line between them', () => {
    const nodes: DocNode[] = [
      { kind: 'code', lang: 'typescript', text: 'const x = 1', title: undefined },
      { kind: 'prose', text: 'After code.' }
    ]
    assert.equal(render(nodes), '```typescript\nconst x = 1\n```\n\nAfter code.')
  })

  test('empty node list produces empty string', () => {
    assert.equal(render([]), '')
  })

})
