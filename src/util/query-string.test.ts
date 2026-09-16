import assert from 'node:assert/strict'
import {test} from 'node:test'
import {buildQueryString} from './query-string.ts'

test('encodes query parameter names and values', () => {
  assert.equal(buildQueryString({'a b': 'x&y'}), 'a%20b=x%26y')
})
