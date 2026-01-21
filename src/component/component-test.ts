import {defineComponent} from "./component.ts";
import assert from "node:assert/strict";
import {describe, it as test} from "node:test";


describe('plain component', () => {
  const C1 = defineComponent('no-attrs', {shadowDOM: 'none'})
  new C1()
})


describe.skip('cssPath', () => {
  /*

   There's no way to support this reasonably in a component library-- the loading of
   files is highly environment dependent. We'll ignore it for now (or forever).
   */
  // test('css with no shadowDOM', async () => {
  //   const C = defineComponent(
  //     'local-css', {
  //       shadowDOM: 'none',
  //       cssPath: path.join(__dirname, './component-test.css')
  //     })
  //
  //   const c = new C();
  //
  //   await c.connectedCallback()
  //
  //   // @ts-ignore
  //   console.log('***', global.document.adoptedStyleSheets[0].toString())
  //   assert.equal(c.root!.innerHTML, 'my-component.css')
  // })
  //
  //
  // test('css with shadowDOM', () => {
  //   const C = defineComponent(
  //     'local-css-shadow', {
  //       shadowDOM: 'open',
  //       cssPath: path.join(__dirname, './component-test.css')
  //     })
  //   const c = new C()
  //   assert.equal(c.shadowRoot!.innerHTML, 'my-component.css')
  // })

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