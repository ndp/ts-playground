import {defineComponent} from "./cycle2";
import sinon from 'sinon';
import assert from "node:assert/strict";
import {describe, test} from "mocha";


describe('attrs', () => {


  test('none', () => {
    const C1 = defineComponent('no-attrs', {shadowDOM: 'none'})
    new C1()
  })

  test('creates getter for required', () => {
    const C2 = defineComponent('reqd-attrs', {shadowDOM: 'none', attrs: ['deckId*']})

    const c2 = new C2()
    c2.setAttribute('deckId', '32k432')
    assert.equal(c2.deckId, '32k432')
  })

  test('complains if required is missing', () => {
    const C5 = defineComponent('reqd-attr-missing', {shadowDOM: 'none', attrs: ['deckId*']})

    const c5 = new C5() as unknown as { connectedCallback: () => void }

    assert.throws(() => {
      c5.connectedCallback()
    }, /Missing required attribute deckId/)
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

})
