// ********************************************************************************************************************

type ComponentOptions<Attr extends string> = {
  shadowDOM: 'open' | 'closed' | 'none',
  css?: string,
  cssPath?: string,
  attrs?: Array<Attr>
}

type AttrMethods<Attrs extends Array<string> | undefined> = Attrs extends Array<string> ? Readonly<{
  [K in StripAnnotations<Attrs[number]>]: string
}> : {}

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

export function defineComponent<Attr extends string, Options extends ComponentOptions<Attr>>(
  name: string,
  options: Options
) {

  if (customElements.get(name)) throw `Custom element ${name} already defined.`
  if (!/-/.test(name)) throw "Custom element names must contain a hyphen."
  if (name !== name.toLowerCase()) throw "Custom element names must be lowercase."

  const elementClass = class extends HTMLElement {

    private root: ShadowRoot | HTMLElement;

    constructor() {
      super()
      if (options.shadowDOM !== 'none')
        this.root = this.attachShadow({mode: options.shadowDOM})
      else
        this.root = this
    }

    connectedCallback() {
      this.validateRequiredAttributes();
      this.addCss()
    }

    // Begin Attributes
    private validateRequiredAttributes() {
      requiredAttrs(options.attrs).forEach(attr => {
        if (!this.hasAttribute(attr)) throw `Missing required attribute ${attr}`
      })
    }

    private async addCss() {
      if (options.css) {
        const style = document.createElement('style')
        style.textContent = options.css
        this.root.appendChild(style)
      }

      if (options.cssPath) {
        const cssModule = await import(options.cssPath, {
          assert: {type: 'css'}
        });
        if (options.shadowDOM === 'none')
          document.adoptedStyleSheets = [cssModule.default];
        else
          this.shadowRoot!.adoptedStyleSheets = [cssModule.default];
      }
    }

    static get observedAttributes() {
      return dynamicAttrs(options.attrs) || []
    }


    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
      console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
      const e = new CustomEvent(
        'attribute-changed',
        {detail: {name, oldValue, newValue}})
      this.dispatchEvent(e)
    }

    // End Attributes

  }

  // Add accessors for attributes
  if (options.attrs) {
    for (const attr of options.attrs) {
      const sanitized = sanitizeAttr(attr)
      Object.defineProperty(elementClass.prototype, sanitized, {
        get() {
          return this.getAttribute(sanitized) || ''
        },
      })
    }

  }


  // Register and Return
  customElements.define(name, elementClass)

  return elementClass as unknown as {
    prototype: HTMLElement & AttrMethods<Options['attrs']>;
    new(): HTMLElement & AttrMethods<Options['attrs']>;
  };

}


function sanitizeAttr(attr: string) {
  return attr.replace(/[*`🗱]/g, '');
}

function requiredAttrs(attrs?: Array<string>): Array<string> {
  return attrs?.filter(a => a.includes('*')).map(a => sanitizeAttr(a)) || []
}

function dynamicAttrs(attrs?: Array<string>): Array<string> {
  return attrs?.filter(a => a.includes('🗱')).map(a => sanitizeAttr(a)) || []
}


export type AssertEqual<T, Expected> = [T] extends [Expected]
  ? [Expected] extends [T]
    ? true
    : false
  : false;


type StripAnnotations<T> = T extends `${infer U}*${infer Ignore}`
  ? U extends `${infer F}🗱` ? F : U
  : T extends `${infer F}🗱` ? F : T


// type StripAnnotationsA = AssertEqual<StripAnnotations<'a'>, 'a'>
// type StripAnnotationsB = AssertEqual<StripAnnotations<'a*'>, 'a'>
// type StripAnnotationsC = AssertEqual<StripAnnotations<'a🗱'>, 'a'>
// type StripAnnotationsD = AssertEqual<StripAnnotations<'a🗱*'>, 'a'>
// type StripAnnotationsE = AssertEqual<StripAnnotations<'a*🗱'>, 'a'>
// type TestStripAnnotations = StripAnnotationsA & StripAnnotationsB & StripAnnotationsC & StripAnnotationsD & StripAnnotationsE
