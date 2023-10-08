import {describe, mock, test} from "node:test";
import {pathToJS} from "../generate.mjs";
import assert from "node:assert/strict";
import {OriginAndBelow, ScopeAndBelow} from "../strategies.mjs";

describe('pathToJS', () => {

  test('returns a string quoted', () => {
    const actual = pathToJS('astring')

    assert.equal(actual, "'astring'")
  })

  test('returns a RegExp raw', () => {
    const actual = pathToJS(/re/)

    assert.equal(actual, '/re/')
  })


  test('replaces Symbol.for("origin") with origin matcher', (t) => {
    const actual = pathToJS(OriginAndBelow)

    assert.equal(actual, 'ORIGIN_MATCHER')
  })

  test('replaces Symbol.for("scope") with scope matcher', (t) => {

    const actual = pathToJS(ScopeAndBelow)

    assert.equal(actual, 'SCOPE_MATCHER')
  })

})

