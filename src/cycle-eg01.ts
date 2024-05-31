import {defineComponent} from "./cycle2.js";
import {buildDOM, renderDOMFromString, ComponentRenderer, renderFromString, makeStringBuilder} from "./cycle2-render";


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
const exampleBuildRenderer = function (root) {
  const div = document.createElement('div')
  root.appendChild(div)
  return {}
} satisfies ComponentRenderer
// Example of how you might write a renderer with subelements
const exampleBuildRendererWithSubElements = function (root) {
  const div = document.createElement('div')
  root.appendChild(div)

  return {div}
} satisfies ComponentRenderer
function exampleRendererWithEventHandlersAttached(root) {
  const span = document.createElement('span')
  span.addEventListener('click', function () {

  })
  root.appendChild(span)

  return {span}
} /// satisfies RootRenderer

// Examples using a STRING to render from
const exampleRenderFromHTML =
  makeStringBuilder(`<div>Hello World</div>`)
const exampleRenderFromHTMLWithSubElement =
  makeStringBuilder(`<div>Hello World</div>`,
    {div: 'div'});


// Possible usage of the library method
const root = document.createElement('div')
const rs0 = buildDOM(exampleBuildRenderer)
const rs1 = buildDOM(exampleBuildRendererWithSubElements)
const rs2 = buildDOM(exampleRendererWithEventHandlersAttached)
const rs3 = buildDOM(exampleRenderFromHTML)
const rs4 = buildDOM(exampleRenderFromHTMLWithSubElement)


const rs5 =
  renderFromString(
    `<sldfd class="zipcode"></sldfd><button>+</button><button>-</button>`,
    {
      zipcode: '.zipcode',
      inc: 'button:nth-child(2)/click',
      dec: 'button:nth-child(3)/click'
    })

renderFromString(`<sldfd class="zipcode"></sldfd><button>+</button><button>-</button>`)

const zipcode = this.root.querySelector('.zipcode', 'change')
}


const renderState =
  renderFromString(
    `<sldfd class="zipcode"></sldfd><button>+</button><button>-</button>`,
    {
      zipcode: '.zipcode',
      inc: 'button:nth-child(2)/click',
      dec: 'button:nth-child(3)/click'
    })

  //
  // onAction('change', function () {
  //   zipcode.textContent = 'hello'
  // }
  // onAction('inc', function () {
  //   zipcode.textContent = zipcode.textContent + 1
  // }
  // onAction('dec', function () {
  //   zipcode.textContent = zipcode.textContent - 1
  // }

