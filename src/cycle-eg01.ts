import {defineComponent} from "./cycle2.js";
import {
  ComponentRenderer,
  renderFromString,
  makeStringBuilder,
  buildDOM,
  SubElementSelectorsMap, RenderContext
} from "./cycle2-render";


const C = defineComponent<'change'>('my-component',
  {
    shadowDOM: 'open',
    cssPath: './cycle2-test.css',
    // renderDOM(state: State) {
    //   return `<div>Hello World</div>`
    // },
    // detectIntent: {
    //   click: function (e) {
    //     return {
    //       type: 'change', detail: {}
    //     }
    //   }
    // },
    // act: {
    //   'observed-attribute-changed': async function () {
    //     return {publish: new CustomEvent('foo')}
    //   },
    //   change: async function () {
    //     return {publish: new CustomEvent('foo')}
    //   }
    // },
    // observedAttributes: ['foo', 'bar']
  })



// Example of how you might write a renderer
const exampleBuildRenderer = function () {
  const div = document.createElement('div')
 this. root.appendChild(div)
  return {}
} satisfies ComponentRenderer
// Example of how you might write a renderer with subelements
const exampleBuildRendererWithSubElements = function () {
  const div = document.createElement('div')
  this.root.appendChild(div)

  return {div}
} satisfies ComponentRenderer
function exampleRendererWithEventHandlersAttached() {
  const span = document.createElement('span')
  span.addEventListener('click', function () {

  })
  this.root.appendChild(span)

  return {span}
} /// satisfies RootRenderer

// Examples using a STRING to render from
const exampleRenderFromHTML =
  makeStringBuilder(`<div>Hello World</div>`, {}) satisfies ComponentRenderer
const exampleRenderFromHTMLWithSubElement =
  makeStringBuilder(`<div>Hello World</div>`,
    {div: 'div'}) satisfies ComponentRenderer;

const exampleRenderMultipleSubElements =
  makeStringBuilder(`<sldfd class="zipcode"></sldfd><button>+</button><button>-</button>`,
    {
      zipcode: '.zipcode',
      inc: 'button:nth-child(2)',
      dec: 'button:nth-child(3)'
    }) satisfies ComponentRenderer

const exampleRenderFromDynamicHTML =
  makeStringBuilder(() => `<div>Hello World</div>`, {})

const exampleRenderFromDynamicHTMLWithSubElement =
  makeStringBuilder(function (this: RenderContext) { return `<div>Hello <span>World</span></div>`}, {span: 'span'})

// Possible usage of the library method
const root = document.createElement('div')
const rs0 = buildDOM(exampleBuildRenderer)
const rs1 = buildDOM(exampleBuildRendererWithSubElements)
const rs2 = buildDOM(exampleRendererWithEventHandlersAttached)
const rs3 = buildDOM(exampleRenderFromHTML)
const rs4 = buildDOM(exampleRenderFromHTMLWithSubElement)
const rs5 = buildDOM(exampleRenderMultipleSubElements)
const rs6 = buildDOM(exampleRenderFromDynamicHTML)
const rs7 = buildDOM(exampleRenderFromDynamicHTMLWithSubElement)

