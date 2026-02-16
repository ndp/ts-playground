import {type ComponentRenderer, type RenderContext, type SubElementsMap} from './render.ts'
import {type TagName, type TagNameLiteral} from './TagName.ts'

type ExtendableStringTuple = readonly [string?, string?, string?, string?, string?, string?, string?, string?]
type ExtendableStringTuple3 = readonly [...ExtendableStringTuple, ...ExtendableStringTuple, ...ExtendableStringTuple]

export class ComponentBwilder<
  ObservedAttrs extends ExtendableStringTuple = [],
  UnobservedAttrs extends ExtendableStringTuple = [],
  SubElements extends SubElementsMap = {},
  AllAttrs extends ExtendableStringTuple3 = [...ObservedAttrs, ...UnobservedAttrs],
  AttrsRecord extends {} = AllAttrs[number] extends string ? Record<AllAttrs[number], string> : {},
  RenderingContext extends RenderContext<{}> = RenderContext<AttrsRecord>> {

  private tagName?: string
  private css: string | undefined
  private shadowDOM: 'open' | 'closed' | 'none' = 'open'
  private observedAttrs: Record<string, ((args: { newValue: unknown, oldValue: unknown }) => void) | null> = {}
  private unobservedAttrs: Record<string, string | null> = {}
  private elementNames: string[] = []
  private renderFn: ComponentRenderer<RenderingContext, SubElements> | undefined
  private postMountFn?: (this: RenderingContext, context: RenderingContext) => void | Promise<void>
  private postRenderFn?: (this: RenderingContext, context: RenderingContext) => void | Promise<void>

  constructor() {
  }

  wTagName<T extends string>(tagName: TagNameLiteral<T> | TagName) {
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

  wPostMountFn(postMountFn: (this: RenderingContext, context: RenderingContext) => void | Promise<void>) {
    this.postMountFn = postMountFn
    return this as this & { wPostMountFn: never }
  }

  wPostRenderFn(postRenderFn: (this: RenderingContext, context: RenderingContext) => void | Promise<void>) {
    this.postRenderFn = postRenderFn
    return this as this & { wPostRenderFn: never }
  }

  build() {

    if (!this.renderFn) throw new Error('No render function provided to component')

    const renderFn: ComponentRenderer<RenderingContext, SubElements> = this.renderFn

    const builder = this
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
        const context = this as unknown as RenderingContext
        const rendered = this.render()

        const callPostMount = () => {
          if (!builder.postMountFn) return
          return builder.postMountFn.call(context, context)
        }

        if (isPromiseLike(rendered)) {
          return Promise.resolve(rendered).then(() => callPostMount())
        }

        const postMountResult = callPostMount()
        if (isPromiseLike(postMountResult))
          return postMountResult
      }

      render() {

        const context = this as unknown as RenderingContext
        const renderResult = renderFn.call(context, context)

        const afterRender = () => {
          if (this.root.querySelector('style') === null && builder.css) {
            const styleEl = document.createElement('style');
            styleEl.textContent = builder.css;
            this.root.prepend(styleEl);
          }

          if (builder.postRenderFn)
            return builder.postRenderFn.call(context, context)
        }

        if (isPromiseLike(renderResult)) {
          return Promise.resolve(renderResult).then(() => afterRender())
        }

        const postRenderResult = afterRender()
        if (isPromiseLike(postRenderResult))
          return postRenderResult
      }

    }

    for (let a in builder.observedAttrs)
      Object.defineProperty(elementClass.prototype, a, {
        get: function() {
          return this.getAttribute(a)
        },
        enumerable: true,
        configurable: true
      });

    for (let a in builder.unobservedAttrs)
      Object.defineProperty(elementClass.prototype, a, {
        get: function() {
          return this.getAttribute(a) ?? builder.unobservedAttrs[a];
        },
        enumerable: true,
        configurable: true
      });

    // Register and Return
    if (this.tagName)
      customElements.define(this.tagName, elementClass)

    return elementClass as unknown as ConstructorOf<HTMLElement & { connectedCallback(): Promise<void> | void, root: ShadowRoot | HTMLElement }>
    //
    // return elementClass as unknown as {
    //   prototype: HTMLElement & { connectedCallback(): Promise<void> | void, root: ShadowRoot | HTMLElement };
    //   new(): HTMLElement & { connectedCallback(): Promise<void> | void, root: ShadowRoot | HTMLElement };
    // };

  }
}

type ConstructorOf<T> = new (...args: any[]) => T;

function isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
  if (!value || (typeof value !== 'object' && typeof value !== 'function'))
    return false
  return typeof (value as PromiseLike<T>).then === 'function'
}
