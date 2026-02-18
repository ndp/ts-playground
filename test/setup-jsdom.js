import { JSDOM } from 'jsdom';

const dom = new JSDOM();
global.jsdom = dom
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement
global.Element = dom.window.Element
global.ShadowRoot = dom.window.ShadowRoot
global.CSSStyleSheet = dom.window.CSSStyleSheet

global.CustomEvent = dom.window.CustomEvent

if (typeof global.CSSStyleSheet !== 'function') {
  class CSSStyleSheetShim {
    constructor() {
      this.cssText = ''
    }

    replaceSync(text) {
      this.cssText = text
    }

    replace(text) {
      this.cssText = text
      return Promise.resolve(this)
    }
  }
  global.CSSStyleSheet = CSSStyleSheetShim
}

if (typeof global.CSSStyleSheet.prototype.replaceSync !== 'function') {
  global.CSSStyleSheet.prototype.replaceSync = function(text) {
    this.cssText = text
  }
}

if (typeof global.CSSStyleSheet.prototype.replace !== 'function') {
  global.CSSStyleSheet.prototype.replace = function(text) {
    this.cssText = text
    return Promise.resolve(this)
  }
}

const adoptedSheetsStore = new WeakMap()
function defineAdoptedStyleSheetsProperty(target) {
  if (!target || Object.getOwnPropertyDescriptor(target, 'adoptedStyleSheets'))
    return

  Object.defineProperty(target, 'adoptedStyleSheets', {
    get() {
      return adoptedSheetsStore.get(this) ?? []
    },
    set(sheets) {
      adoptedSheetsStore.set(this, Array.isArray(sheets) ? sheets : [])
    }
  })
}

defineAdoptedStyleSheetsProperty(global.ShadowRoot?.prototype)
defineAdoptedStyleSheetsProperty(global.document.constructor?.prototype)

Object.defineProperty(document, 'adoptedStyleSheets', {
  get() {
    return global.stylesheets ?? []
  },
  set(ss) {
    global.stylesheets = ss
  }
})