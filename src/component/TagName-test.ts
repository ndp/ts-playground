import {describe, test} from 'node:test'
import {strict as assert} from 'node:assert'
import {ComponentBwilder} from './componentBwilder.ts'
import {
  assertValidTagName,
  isValidTagName,
  type TagNameLiteral
} from './TagName.ts'

const assertTypeTagName = <T extends string>(tagName: TagNameLiteral<T>) => tagName

// TypeScript static tests
assertTypeTagName('my-component')

// @ts-expect-error
assertTypeTagName('mycomponent')

// @ts-expect-error
assertTypeTagName('My-component')

// @ts-expect-error
assertTypeTagName('my component')

new ComponentBwilder().wTagName(assertTypeTagName('type-safe-component'))

const narrowedTagName: string = 'validated-tag-name'
assertValidTagName(narrowedTagName)
new ComponentBwilder().wTagName(narrowedTagName)

describe('Tag name validators', () => {
  test('isValidTagName returns true for legal tag names', () => {
    assert.equal(isValidTagName('my-component'), true)
    assert.equal(isValidTagName('a-1'), true)
    assert.equal(isValidTagName('my.component-name'), true)
  })

  test('isValidTagName returns false for illegal tag names', () => {
    assert.equal(isValidTagName('mycomponent'), false)
    assert.equal(isValidTagName('My-component'), false)
    assert.equal(isValidTagName('my component'), false)
    assert.equal(isValidTagName('annotation-xml'), false)
    assert.equal(isValidTagName('-leading-dash'), false)
  })

  test('assertValidTagName narrows and throws for invalid input', () => {
    const legalTag: string = 'assert-validated-tag'
    assertValidTagName(legalTag)
    new ComponentBwilder().wTagName(legalTag)

    assert.throws(() => {
      assertValidTagName('invalidtag')
    }, /Invalid custom element tag name/)
  })
})
