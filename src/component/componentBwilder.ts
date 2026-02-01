import {type ComponentRenderer, type RenderContext, type SubElementsMap} from './render.ts'


type ExtendableStringTuple = readonly [string?, string?, string?, string?, string?, string?, string?, string?]
type ExtendableStringTuple3 = readonly [...ExtendableStringTuple, ...ExtendableStringTuple, ...ExtendableStringTuple]

export class ComponentBwilder<
  ObservedAttrs extends ExtendableStringTuple = [],
  UnobservedAttrs extends ExtendableStringTuple = [],
  SubElements extends SubElementsMap = {},
  AllAttrs extends ExtendableStringTuple3 = [...ObservedAttrs, ...UnobservedAttrs],
  AttrsRecord extends {} = AllAttrs[number] extends string ? Record<AllAttrs[number], string> : {},
  RenderingContext extends RenderContext<{}> = RenderContext<AttrsRecord>> {

  private tagName: string | undefined
  private css: string | undefined
  private shadowDOM: 'open' | 'closed' | 'none' = 'open'
  private observedAttrs: Record<string, ((args: { newValue: unknown, oldValue: unknown }) => void) | null> = {}
  private unobservedAttrs: Record<string, string | null> = {}
  private elementNames: string[] = []
  private renderFn: ComponentRenderer<RenderingContext, SubElements> | undefined

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

  wAttr<A extends string>(attr: A, defaultValue?: string) {
    this.unobservedAttrs[attr] = defaultValue ?? null
    // @ts-ignore TS2344
    return this as unknown as ComponentBwilder<ObservedAttrs, [...UnobservedAttrs, A]>;
  }

  wObservedAttr<A extends string>(attr: A,
                                  onChange?: (args: { newValue: unknown, oldValue: unknown }) => void) {
    if (attr in this.observedAttrs)
      throw new Error(`Attr "${attr}" is already observed.`)
    this.observedAttrs[attr] = onChange ?? null
    // @ts-ignore TS2344
    return this as unknown as ComponentBwilder<[...ObservedAttrs, A]>;
  }

  wElement<A extends string>(elementName: A) {
    this.elementNames.push(elementName);
    // @ts-ignore TS2344
    return this as unknown as ComponentBwilder<ObservedAttrs, UnobservedAttrs, SubElementsMap<A | keyof SubElements>>;
  }

  wRender(renderFn: ComponentRenderer<RenderingContext, SubElements>) {
    this.renderFn = renderFn
    return this as unknown as ComponentBwilder<ObservedAttrs> & { wRender: never };
  }

  build() {

    const builder = this

    const renderFn: ComponentRenderer<RenderingContext, SubElements> | undefined = builder.renderFn
    if (!renderFn) throw new Error('No render function provided to component')

    const elementClass = class extends HTMLElement {

      private readonly root: ShadowRoot | HTMLElement;

      constructor() {
        super()
        if (builder.shadowDOM !== 'none')
          this.root = this.attachShadow({mode: builder.shadowDOM})
        else
          this.root = this

        // if (this.onSlotChange)
        //    this.onSlotChange = this.onSlotChange.bind(this);

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

        // Build out context
        const context = {
          root: this.root
        } as RenderingContext;
        for (let a in builder.observedAttrs) // @ts-ignore
          context[a] = this.getAttribute(a);
        for (let a in builder.unobservedAttrs) // @ts-ignore
          context[a] = this.getAttribute(a) ?? builder.unobservedAttrs[a];

        renderFn.call(context);

        // Inject CSS if provided
        if (this.root.querySelector('style') === null && builder.css) {
          const styleEl = document.createElement('style');
          styleEl.textContent = builder.css;
          this.root.prepend(styleEl);
        }
      }

    }


    // Register and Return
    customElements.define(this.tagName!, elementClass)

    return elementClass as unknown as {
      prototype: HTMLElement & { connectedCallback(): Promise<void> | void, root: ShadowRoot | HTMLElement };
      new(): HTMLElement & { connectedCallback(): Promise<void> | void, root: ShadowRoot | HTMLElement };
    };

  }
}


