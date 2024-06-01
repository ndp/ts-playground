import {
  ComponentRenderer,
  makeStringBuilder,
  buildDOM,
  RenderContext
} from "./render";

// Example of how you might write a renderer
const exampleBuildRenderer = function (this: RenderContext) {
  const div = document.createElement('div')
  this.root.appendChild(div)
  return {}
} satisfies ComponentRenderer
// Example of how you might write a renderer with subelements
const exampleBuildRendererWithSubElements = function (this: RenderContext) {
  const div = document.createElement('div')
  this.root.appendChild(div)

  // Returning the subelements makes them generally available in the component.
  return {div}
} satisfies ComponentRenderer<{ div: HTMLDivElement }>

function exampleRendererWithEventHandlersAttached(this: RenderContext) {
  const span = document.createElement('span')
  span.addEventListener('click', function () {

  })
  this.root.appendChild(span)

  return {span}
}

// Examples using a STRING to render from
const exampleRenderFromHTML =
  makeStringBuilder(`<div>Hello World</div>`, {}) satisfies ComponentRenderer

const exampleRenderFromHTMLWithSubElement =
  makeStringBuilder(`<div>Hello <span>World</span></div>`,
    {span: 'span'}) satisfies ComponentRenderer;

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
  makeStringBuilder(function (this: RenderContext<{name?: string}>) {
    return `<div>Hello <span>${this.name || 'World'}</span></div>`
  }, {span: 'span'})

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

