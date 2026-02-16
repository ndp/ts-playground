import {type AttrMethods, observedAttrs, requiredAttrs, stripAnnotations} from "./attr.ts";

// type F0a = AttrMethods<['deckId']>
// type F0aa = AssertEqual<F0a, {deckId: string}>
// type F0b = AttrMethods<['deckId','bobId']>
// type F0bb = AssertEqual<F0b, { deckId: string, bobId: string }>
// type F1 = AttrMethods<undefined>
// type F1a = AssertEqual<F1, {}>
// type F2a = AttrMethods<['deckId*']> // required
// type F2aa = AssertEqual<F2a, {deckId: string}>
// type F3a = AttrMethods<['deckId🗱*']> // required
// type F3aa = AssertEqual<F3a, {deckId: string}>
// type F4a = AttrMethods<['deckId🗱']> // required
// type F4aa = AssertEqual<F4a, {deckId: string}>

// ********************************************************************************************************************

type DefineComponentOptions<Attr extends string> = {
  shadowDOM: 'open' | 'closed' | 'none',
  css?: string,
  attrs?: Array<Attr>
  // onAttrChanged?: (this: HTMLElement & AttrMethods<Attr>, details: {
  //   name: StripAnnotations<Attr>,
  //   oldValue: string,
  //   newValue: string
  // }) => void
}



export function defineComponent<Attr extends string, Options extends DefineComponentOptions<Attr>>(
  tagName: string,
  options: Options
) {

  if (customElements.get(tagName)) throw `Custom element ${tagName} already defined.`
  if (!/-/.test(tagName)) throw "Custom element names must contain a hyphen."
  if (tagName !== tagName.toLowerCase()) throw "Custom element names must be lowercase."

  const elementClass = class extends HTMLElement {

    private root: ShadowRoot | HTMLElement;

    constructor() {
      super()
      if (options.shadowDOM !== 'none')
        this.root = this.attachShadow({mode: options.shadowDOM})
      else
        this.root = this
    }

    async connectedCallback() {
      this.validateRequiredAttributes();
      await this.addCss()
    }

    // Begin Attributes
    private validateRequiredAttributes() {
      for (const attr of requiredAttrs(options.attrs)) {
        if (!this.hasAttribute(attr)) throw `Missing required attribute "${attr}"`
      }
    }

    private async addCss() {
      if (options.css) {
        const style = document.createElement('style')
        style.textContent = options.css
        this.root.appendChild(style)
      }
    }

    static get observedAttributes() {
      return observedAttrs(options.attrs) || []
    }


    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
      console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
      const e = new CustomEvent(
        'attribute-changed',
        {detail: {name, oldValue, newValue}})
      this.dispatchEvent(e)

      // if (this.onAttrChanged && typeof this.onAttrChanged === 'function') {
      //   this.onAttrChanged({name, oldValue, newValue})
      // }
    }

  }

  // if (options.onAttrChanged) {
  //   elementClass.onAttrChanged = options.onAttrChanged
  // }

  // Add accessors for attributes
  if (options.attrs) {
    for (const attr of options.attrs) {
      const sanitized = stripAnnotations(attr)
      Object.defineProperty(elementClass.prototype, sanitized, {
        get() {
          return this.getAttribute(sanitized) || ''
        }
      })
    }

  }


  // Register and Return
  customElements.define(tagName, elementClass)

  return elementClass as unknown as {
    prototype: HTMLElement & AttrMethods<Options['attrs']> & TestMethods;
    new(): HTMLElement & AttrMethods<Options['attrs']> & TestMethods;
  };

}

interface TestMethods {
  connectedCallback(): Promise<void>
}

/*

Rendering


 */