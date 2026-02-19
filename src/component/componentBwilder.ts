import {type RenderContext, type SubElementInputMap, type SubElementsMap} from './render.ts'
import {type TagName, type TagNameLiteral} from './TagName.ts'
import {Tracker} from '../util/tracker.ts'

type ExtendableStringTuple = readonly [string?, string?, string?, string?, string?, string?, string?, string?]
type ExtendableStringTuple3 = readonly [...ExtendableStringTuple, ...ExtendableStringTuple, ...ExtendableStringTuple]
type SubElementKeys<T extends SubElementsMap> = Extract<keyof T, string>
type BwilderRendererReturn<TSubElements extends SubElementsMap>
  = SubElementInputMap<SubElementKeys<TSubElements>> | void
type ComponentBwilderRenderer<TContext extends RenderContext, TSubElements extends SubElementsMap>
  = (this: TContext, context: TContext) => BwilderRendererReturn<TSubElements> | Promise<BwilderRendererReturn<TSubElements>>
type CSSMode = 'adopted' | 'inline'

export class ComponentBwilder<
  ObservedAttrs extends ExtendableStringTuple = [],
  UnobservedAttrs extends ExtendableStringTuple = [],
  SubElements extends SubElementsMap = {},
  AllAttrs extends ExtendableStringTuple3 = [...ObservedAttrs, ...UnobservedAttrs],
  AttrsRecord extends {} = AllAttrs[number] extends string ? Record<AllAttrs[number], string> : {},
  RenderingContext extends RenderContext<{}, SubElementsMap> = RenderContext<AttrsRecord, SubElements>,
  ComponentType = HTMLElement & RenderingContext> {

  private tagName?: string | null
  private css: { text: string, requestedMode: CSSMode } | undefined
  private shadowDOM: 'open' | 'closed' | 'none' = 'open'
  private observedAttrs: Record<string, ((args: {
    name: string,
    newValue: unknown,
    oldValue: unknown
  }) => void) | null> = {}
  private unobservedAttrs: Record<string, string | null> = {}
  private subElementNames: string[] = []
  private renderFn: ComponentBwilderRenderer<RenderingContext, SubElements> | undefined
  private postMountFn?: (this: ComponentType, context: ComponentType) => void | Promise<void>
  private postRenderFn?: (this: ComponentType, context: ComponentType) => void | Promise<void>
  private slotAddedHandler: (<TEl extends HTMLElement>(this: ComponentType, context: ComponentType, slottedEl: TEl) => () => void) | undefined

  constructor() {
  }

  wTagName<T extends string>(tagName: TagNameLiteral<T> | TagName | null) {
    this.tagName = tagName
    return this as this & { wTagName: never }
  }


  wShadowDOM(mode: typeof this.shadowDOM) {
    this.shadowDOM = mode
    return this as this & { wShadowDOM: never }
  }

  wCSS(css: string, requestedMode: CSSMode = 'adopted') {
    this.css = {text: css, requestedMode}
    return this as this & { wCSS: never }
  }

  wAttr<A extends string>(attr: A, defaultValue?: string) {
    this.unobservedAttrs[attr] = defaultValue ?? null
    // @ts-ignore TS2344
    return this as unknown as ComponentBwilder<ObservedAttrs, [...UnobservedAttrs, A]>;
  }

  wObservedAttr<A extends string>(attr: A,
                                  onChange?: (args: { name: string, newValue: unknown, oldValue: unknown }) => void) {
    if (attr in this.observedAttrs)
      throw new Error(`Attr "${attr}" is already observed.`)
    this.observedAttrs[attr] = onChange ?? null
    // @ts-ignore TS2344
    return this as unknown as ComponentBwilder<[...ObservedAttrs, A]>;
  }

  wElement<A extends string>(elementName: A) {
    this.subElementNames.push(elementName);
    // @ts-ignore TS2344
    return this as unknown as ComponentBwilder<ObservedAttrs, UnobservedAttrs, SubElementsMap<A | keyof SubElements>>;
  }

  wRender(renderFn: ComponentBwilderRenderer<RenderingContext, SubElements>) {
    this.renderFn = renderFn
    return this as this & { wRender: never };
  }

  wPostMountFn(postMountFn: (this: ComponentType, context: ComponentType) => void | Promise<void>) {
    this.postMountFn = postMountFn as any
    return this as this & { wPostMountFn: never }
  }

  wPostRenderFn(postRenderFn: (this: ComponentType, context: ComponentType) => void | Promise<void>) {
    this.postRenderFn = postRenderFn as any
    return this as this & { wPostRenderFn: never }
  }

  // Add handler for slot changes that will be wired up in post-mount.
  // Handler is called with the component context and the slotted element that triggered the change.
  // @returns a cleanup function that will be called on component disconnect, if needed.
  wSlotAddedHandler(handler: <TEl extends HTMLElement>(this: ComponentType,
                                                       context: ComponentType,
                                                       slottedEl: TEl) => () => void) {
    this.slotAddedHandler = handler
    return this as this & { wSlotAddedHandler: never }

  }

  build() {

    if (!this.renderFn) throw new Error('No render function provided to component')
    if (this.tagName === undefined) throw new Error('tagName must be explicitly set to a string or null')

    const renderFn: ComponentBwilderRenderer<RenderingContext, SubElements> = this.renderFn

    const builder = this
    const elementClass = class extends HTMLElement {
      private static warnedCSSFallback = false

      readonly root: ShadowRoot | HTMLElement;
      subElements: SubElements = makeDefaultSubElements(builder.subElementNames) as SubElements
      private slotTracker = builder.slotAddedHandler ? new Tracker<HTMLSlotElement>() : null
      private assignedTracker = builder.slotAddedHandler ? new Tracker<HTMLElement>() : null
      private slotAddUnsub?: () => void
      private assignedAddUnsub?: () => void

      constructor() {
        super()
        if (builder.shadowDOM !== 'none')
          this.root = this.attachShadow({mode: builder.shadowDOM})
        else
          this.root = this as any

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

        const rendered = this.render()

        if (!builder.postMountFn)
          return rendered

        const context = this as unknown as ComponentType
        const runPostMount = () => builder.postMountFn!.call(context, context)

        return isPromiseLike(rendered)
          ? rendered.then(() => runPostMount())
          : runPostMount()
      }

      disconnectedCallback() {
        if (builder.slotAddedHandler)
          this.teardownSlotHandlers()
      }

      render() {

        const context = this as unknown as RenderingContext
        const renderResult = renderFn.call(context, context)

        const afterRender = (returnedSubElements?: unknown) => {
          this.subElements = normalizeSubElements(this.root, returnedSubElements, builder.subElementNames) as SubElements

          if (builder.slotAddedHandler)
            this.refreshSlotHandlers(context as unknown as ComponentType)

          if (builder.css) {
            const actualMode = resolveCSSMode(this.root, builder.css.requestedMode)

            if (actualMode !== builder.css.requestedMode && !elementClass.warnedCSSFallback) {
              console.warn(
                `[ComponentBwilder] CSS mode "${builder.css.requestedMode}" is not supported for this root. Falling back to "${actualMode}".`
              )
              elementClass.warnedCSSFallback = true
            }

            if (actualMode === 'adopted') {
              const sheet = ensureStyleSheet(builder.css.text)
              const rootWithSheets = this.root as AdoptedStylesHost
              if (!rootWithSheets.adoptedStyleSheets.includes(sheet))
                rootWithSheets.adoptedStyleSheets = [...rootWithSheets.adoptedStyleSheets, sheet]
            } else if (this.root.querySelector('style') === null) {
              const styleEl = document.createElement('style');
              styleEl.textContent = builder.css.text;
              this.root.prepend(styleEl);
            }
          }

          if (builder.postRenderFn)
            return builder.postRenderFn.call(context as any, context as any)
        }

        if (isPromiseLike(renderResult)) {
          return Promise.resolve(renderResult).then((returnedSubElements) => afterRender(returnedSubElements))
        }

        const postRenderResult = afterRender(renderResult)
        if (isPromiseLike(postRenderResult))
          return postRenderResult
      }

      private refreshSlotHandlers(context: ComponentType) {
        const handler = builder.slotAddedHandler
        if (!this.slotTracker || !this.assignedTracker || !handler)
          return

        if (!this.slotAddUnsub)
          this.slotAddUnsub = this.slotTracker.onAdd((slotEl) => {
            const listener = () => this.refreshAssignedElements(context)
            slotEl.addEventListener('slotchange', listener)
            return () => slotEl.removeEventListener('slotchange', listener)
          })

        if (!this.assignedAddUnsub)
          this.assignedAddUnsub = this.assignedTracker.onAdd((assignedEl) => {
            try { return handler.call(context, context, assignedEl) } catch { /* swallow handler errors */ }
          })

        const slots = Array.from(this.root.querySelectorAll('slot')) as HTMLSlotElement[]
        this.slotTracker.setAll(slots)
        this.refreshAssignedElements(context, slots)
      }

      private refreshAssignedElements(context: ComponentType, slots?: HTMLSlotElement[]) {
        if (!this.slotTracker || !this.assignedTracker)
          return

        const slotList = slots ?? Array.from(this.root.querySelectorAll('slot')) as HTMLSlotElement[]
        const assigned = slotList.flatMap((slot) => {
          const els = slot.assignedElements({flatten: true})
          return els.filter((n): n is HTMLElement => n instanceof HTMLElement)
        })
        this.assignedTracker.setAll(assigned)
      }

      private teardownSlotHandlers() {
        if (!this.slotTracker)
          return

        this.slotTracker.removeAll()

        if (this.assignedTracker) {
          this.assignedTracker.removeAll()
          if (this.assignedAddUnsub) this.assignedAddUnsub()
          this.assignedAddUnsub = undefined
        }

        if (this.slotAddUnsub) this.slotAddUnsub()
        this.slotAddUnsub = undefined
      }

    }

    for (let a in builder.observedAttrs)
      Object.defineProperty(elementClass.prototype, a, {
        get: function (this: HTMLElement) {
          return this.getAttribute(a)
        },
        enumerable: true,
        configurable: true
      });

    for (let a in builder.unobservedAttrs)
      Object.defineProperty(elementClass.prototype, a, {
        get: function (this: HTMLElement) {
          return this.getAttribute(a) ?? builder.unobservedAttrs[a];
        },
        enumerable: true,
        configurable: true
      });

    if (this.tagName !== null)
      customElements.define(this.tagName, elementClass)

    return elementClass as unknown as ConstructorOf<BuiltComponentInstance<RenderingContext, SubElements>>
  }
}

type ConstructorOf<T> = new (...args: any[]) => T;
type BuiltComponentInstance<
  TComponent,
  TSubElements extends SubElementsMap
> = TComponent & HTMLElement & {
  connectedCallback(): Promise<void> | void
  render(): Promise<void> | void
  disconnectedCallback(): void
  root: ShadowRoot | HTMLElement
  subElements: TSubElements
}

type AdoptedStylesHost = {
  adoptedStyleSheets: CSSStyleSheet[]
}

const styleSheetByCssText = new Map<string, CSSStyleSheet>()

function ensureStyleSheet(cssText: string) {
  const existing = styleSheetByCssText.get(cssText)
  if (existing)
    return existing

  const styleSheet = new CSSStyleSheet()
  if (typeof styleSheet.replaceSync !== 'function')
    throw new Error('CSSStyleSheet API is unavailable for adopted mode')
  styleSheet.replaceSync(cssText)

  styleSheetByCssText.set(cssText, styleSheet)
  return styleSheet
}

function supportsAdoptedStyleSheets(root: ShadowRoot | HTMLElement): root is ShadowRoot & AdoptedStylesHost {
  const maybeRoot = root as Partial<AdoptedStylesHost>
  if (!Array.isArray(maybeRoot.adoptedStyleSheets))
    return false
  try {
    void new CSSStyleSheet()
    return true
  } catch {
    return false
  }
}

function resolveCSSMode(root: ShadowRoot | HTMLElement, requestedMode: CSSMode): CSSMode {
  if (requestedMode === 'inline')
    return 'inline'

  return supportsAdoptedStyleSheets(root) ? 'adopted' : 'inline'
}

function isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
  if (!value || (typeof value !== 'object' && typeof value !== 'function'))
    return false
  return typeof (value as PromiseLike<T>).then === 'function'
}

function makeDefaultSubElements(names: string[]) {
  const subElements: Record<string, HTMLElement | null> = {}
  for (const name of names)
    subElements[name] = null
  return subElements
}

function normalizeSubElements(root: ShadowRoot | HTMLElement,
                              rawSubElements: unknown,
                              declaredNames: string[]): SubElementsMap<string> {
  const normalized = makeDefaultSubElements(declaredNames)

  if (!rawSubElements || typeof rawSubElements !== 'object')
    return normalized

  for (const [key, value] of Object.entries(rawSubElements as Record<string, unknown>)) {
    if (typeof value === 'string') {
      normalized[key] = root.querySelector(value)
      continue
    }

    if (value === null || value instanceof HTMLElement) {
      normalized[key] = value as HTMLElement | null
      continue
    }

    normalized[key] = null
  }

  return normalized
}
