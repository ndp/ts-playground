import {defineComponent} from "./component";
import assert from "node:assert/strict";
import {describe, test} from "mocha";
import path from "node:path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));


describe('plain component', () => {
  const C1 = defineComponent('no-attrs', {shadowDOM: 'none'})
  new C1()
})

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
      assert.equal(e, 'Missing required attribute deckId')
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

})


xdescribe('cssPath', () => {

  /*
   JSDom doesn't provide good support for this... or at least the import assertions.
   */
  test('css with no shadowDOM', async () => {
    const C = defineComponent(
      'local-css', {
        shadowDOM: 'none',
        cssPath: path.join(__dirname, './component-test.css')
      })

    const c = new C();

    await c.connectedCallback()

    // @ts-ignore
    console.log('***', global.document.adoptedStyleSheets)
    assert.equal(c.shadowRoot!.innerHTML, 'my-component.css')
  })


  test('css with shadowDOM', () => {
    const C = defineComponent(
      'local-css-shadow', {
        shadowDOM: 'open',
        cssPath: path.join(__dirname, './component-test.css')
      })
    const c = new C()
    assert.equal(c.shadowRoot!.innerHTML, 'my-component.css')
  })

})
/*

const imgSrc = new URL('./asset.webp', import.meta.url);
const image = document.createElement('img');
image.src = imgSrc.href;
document.body.appendChild(image);

 */


describe('css', () => {

  test('css with no shadowDOM', async () => {
    const C = defineComponent(
      'local-css', {
        shadowDOM: 'none',
        css: `h1 { color: red }`
      })

    const c = new C();

    await c.connectedCallback()

    // @ts-ignore
    assert.equal(c.querySelector("style").textContent, 'h1 { color: red }')
  })


  test('css with shadowDOM', async () => {
    const C = defineComponent(
      'local-css-shadow', {
        shadowDOM: 'open',
        css: `h2 { color: blue }`
      })
    const c = new C()
    await c.connectedCallback()
    assert.equal(c.shadowRoot!.innerHTML, '<style>h2 { color: blue }</style>')
  })

})