import {describe, it as test} from 'node:test'
import {defineComponent} from './component.ts'
import assert from "node:assert/strict";
// import {type StripAnnotations} from "./attr.ts";
// import {type AssertEqual} from "../util/typescript.ts";

// type StripAnnotationsA = AssertEqual<StripAnnotations<'a'>, 'a'>
// type StripAnnotationsB = AssertEqual<StripAnnotations<'a*'>, 'a'>
// type StripAnnotationsC = AssertEqual<StripAnnotations<'a🗱'>, 'a'>
// type StripAnnotationsD = AssertEqual<StripAnnotations<'a🗱*'>, 'a'>
// type StripAnnotationsE = AssertEqual<StripAnnotations<'a*🗱'>, 'a'>
// type TestStripAnnotations = StripAnnotationsA & StripAnnotationsB & StripAnnotationsC & StripAnnotationsD & StripAnnotationsE

describe('attrs', () => {

  test('creates getter for required', () => {
    const C = defineComponent('reqd-attrs', {shadowDOM: 'none', attrs: ['deckId*']})

    const c2 = new C()
    c2.setAttribute('deckId', '32k432')
    assert.equal(c2.deckId, '32k432')
  })

  test('complains if required is missing', async() => {
    const C = defineComponent('reqd-attr-missing', {shadowDOM: 'none', attrs: ['deckId*']})

    const c = new C()

    c.connectedCallback().catch(e => {
      assert.equal(e, 'Missing required attribute "deckId"')
    })
  })

  test('creates getter for optional', () => {
    const C = defineComponent('opt-attrs', {shadowDOM: 'none', attrs: ['cardId']})
    const c = new C()
    c.setAttribute('cardId', '32k432')
    const cardId = c.cardId
    assert.equal(cardId, '32k432')
  })

  test('creates observedAttribute for (optional) dynamic', () => {
    const C = defineComponent('dynamic-attrs', {shadowDOM: 'none', attrs: ['cardId🗱']})
    assert.deepStrictEqual((C as unknown as {observedAttributes: string[]}).observedAttributes, ['cardId'])
  })


  test('creates observedAttribute for required and dynamic', () => {
    const C = defineComponent('dynamic-attrs-reqd', {shadowDOM: 'none', attrs: ['cardId*🗱']})
    assert.deepStrictEqual((C as unknown as {observedAttributes: string[]}).observedAttributes, ['cardId'])
  })

  test.skip('calls attrChanged on observed attribute change', async () => {
    // let wasCalled = false;
    // const C = defineComponent('dynamic-attrs-notified', {
    //   shadowDOM: 'none',
    //   attrs: ['cardId*🗱'],
    //   onAttrChanged: function ({name, oldValue, newValue}) {
    //     wasCalled = true
    //     assert.equal(name, 'cardId')
    //     assert.equal(oldValue, null)
    //     assert.equal(newValue, '1234')
    //     assert.equal(this, c)
    //   }
    // })
    //
    // const c = new C()
    // c.setAttribute('cardId', '1235')
    // await new Promise(r => setTimeout(r, 0)) // allow event loop to process
    // assert.equal(wasCalled, true, 'onAttrChanged was not called')

  })

})
