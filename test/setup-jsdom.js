import { JSDOM } from 'jsdom';

const dom = new JSDOM();
global.jsdom = dom
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement

Object.defineProperty(document, 'adoptedStyleSheets', {
  get() {
    return global.stylesheets
  },
  set(ss) {
    global.stylesheets = ss
  }
})