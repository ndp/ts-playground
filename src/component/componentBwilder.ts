import {type ComponentRenderer, type RenderContext} from './render.ts'


type ExtendableStringTuple = readonly [string?, string?, string?, string?, string?, string?, string?, string?]

export class ComponentBwilder<
  ObservedAttrs extends ExtendableStringTuple = [],
  Attrs extends {} = ObservedAttrs[number] extends string ? Record<ObservedAttrs[number], string> : {},
  RenderingContext extends RenderContext<{}> = RenderContext<Attrs>> {

  private tagName: string | undefined
  private css: string | undefined
  private shadowDOM: 'open' | 'closed' | 'none' = 'open'
  private observedAttrs: Record<string, ((args: { newValue: unknown, oldValue: unknown }) => void) | null> = {}
  private renderFn: ComponentRenderer<RenderingContext> | undefined

  constructor() {
  }

  wTagName(tagName: string) {
    this.tagName = tagName
    return this as this & { wTagName: never }
  }


  wShadowDOM(mode: typeof this.shadowDOM) {
    this.shadowDOM = mode
    return this as this & { wShadowDOM: never }
  }

  wCSS(css: string) {
    this.css = css
    return this as this & { wCSS: never }
  }


  wObservedAttr<A extends string>(attr: A,
                                  onChange?: (args: { newValue: unknown, oldValue: unknown }) => void) {
    if (attr in this.observedAttrs)
      throw new Error(`Attr "${attr}" is already observed.`)
    this.observedAttrs[attr] = onChange ?? null
    // @ts-ignore
    return this as unknown as ComponentBwilder<[...ObservedAttrs, A]>;
  }

  wRender(renderFn: ComponentRenderer<RenderingContext>) {
    this.renderFn = renderFn
    return this as unknown as ComponentBwilder<ObservedAttrs> & {wRender: never};
  }

  build() {

    const builder = this

    const renderFn: ComponentRenderer<RenderingContext> | undefined = builder.renderFn
    if (!renderFn) throw new Error('No render function provided to component')

    const elementClass = class extends HTMLElement {

      private root: ShadowRoot | HTMLElement;

      constructor() {
        super()
        if (builder.shadowDOM !== 'none')
          this.root = this.attachShadow({mode: builder.shadowDOM})
        else
          this.root = this
      }

      static get observedAttributes() {
        return Object.keys(builder.observedAttrs);
      }

      attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown) {
        const action = builder.observedAttrs[name];
        if (action) {
          action.call(this, {name, oldValue, newValue});
        } else
          this.render()
      }

      connectedCallback() {
        console.log(`Component <${builder.tagName}> connected to DOM.`)
        this.render();
      }

      render() {
        const context = {
          root: this.root,
        } as RenderingContext;
        for (let a in builder.observedAttrs) // @ts-ignore
          context[a] = this.getAttribute(a);
        console.log(`Component <${builder.tagName}> rendering... @ root ${this.root.constructor.name}`)
        renderFn.call(context);
      }

    }



    // Object.entries(this.observedAttrs).forEach(([attr,action]) => {
    //   if (action)
    //
    // })


    // Register and Return
    customElements.define(this.tagName!, elementClass)

    return elementClass as unknown as {
      prototype: HTMLElement;
      new(): HTMLElement;
    };

  }
}


