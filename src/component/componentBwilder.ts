import {type RenderContext, type SubElementInputMap, type SubElementsMap} from './render.ts'
import {type TagName, type TagNameLiteral} from './TagName.ts'
import {type ExtractFieldName, type OptionalIfNeeded, parseFieldName} from './element-name-parser.ts'
import {Tracker} from '@ndp-software/util'

type SubElementKeys<T extends SubElementsMap> = Extract<keyof T, string>
type BwilderRendererReturn<TSubElements extends SubElementsMap>
  = SubElementInputMap<SubElementKeys<TSubElements>> | void
type ComponentBwilderRenderer<TContext extends RenderContext, TSubElements extends SubElementsMap>
  = (this: TContext, context: TContext) => BwilderRendererReturn<TSubElements> | Promise<BwilderRendererReturn<TSubElements>>
type CSSMode = 'adopted' | 'inline'

let gWarnedCSSFallback = false

export class ComponentBwilder<
  SubElements extends SubElementsMap = {},
  StateRecord extends Record<string, unknown> = {},
  AttrsRecord extends {} = {},
  RenderingContext extends RenderContext<{}, SubElementsMap> = RenderContext<AttrsRecord, SubElements, StateRecord>,
  ComponentType = HTMLElement & RenderingContext & {requestUpdate: () => void|Promise<void>}> {

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
  private stateDefinitions: Record<string, unknown | (() => unknown)> = {}
  private renderFn: ComponentBwilderRenderer<RenderingContext, SubElements> | undefined
  private postMountFn?: (this: ComponentType, context: ComponentType) => void | (() => void) | Promise<void> | Promise<() => void>
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
    const parsed = parseFieldName(attr)
    this.unobservedAttrs[parsed.name] = defaultValue ?? null
    return this as unknown as ComponentBwilder<
      SubElements,
      StateRecord,
      AttrsRecord & Record<ExtractFieldName<A>, string>
    >;
  }

  wObservedAttr<A extends string>(attr: A,
                                  onChange?: (this: ComponentType, args: { name: string, newValue: unknown, oldValue: unknown }) => void) {
    const parsed = parseFieldName(attr)
    if (parsed.name in this.observedAttrs)
      throw new Error(`Attr "${parsed.name}" is already observed.`)
    this.observedAttrs[parsed.name] = onChange ?? null
    return this as unknown as ComponentBwilder<
      SubElements,
      StateRecord,
      AttrsRecord & Record<ExtractFieldName<A>, string>>;
  }

  wElement<A extends string, T extends HTMLElement = HTMLElement>(
    elementName: A,
    elementType?: new (...args: any[]) => T
  ) {
    const parsed = parseFieldName(elementName)
    this.subElementNames.push(parsed.name);
    return this as unknown as ComponentBwilder<
      {[k in keyof SubElements]: SubElements[k]} & Record<ExtractFieldName<A>, OptionalIfNeeded<T, A>>,
      StateRecord,
      AttrsRecord
    >;
  }

  wState<N extends string, T>(name: N, initial: T | (() => T)) {
    const parsed = parseFieldName(name)
    this.stateDefinitions[parsed.name] = initial
    return this as unknown as ComponentBwilder<SubElements, StateRecord & Record<ExtractFieldName<N>, T>, AttrsRecord>
  }

  wRender(renderFn: ComponentBwilderRenderer<RenderingContext, SubElements>) {
    this.renderFn = renderFn
    return this as this & { wRender: never };
  }

  wConnectedFn(postMountFn: (this: ComponentType, context: ComponentType) => void | (() => void) | Promise<void> | Promise<() => void>) {
    this.postMountFn = postMountFn as any
    return this as this & { wConnectedFn: never }
  }

  wAfterUpdateFn(postRenderFn: (this: ComponentType & {render: never}, context: ComponentType & {requestUpdate: never}) => void | Promise<void>) {
    this.postRenderFn = postRenderFn as any
    return this as this & { wAfterUpdateFn: never }
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

  bwild() {

    if (!this.renderFn) throw new Error('No render function provided to component')
    if (this.tagName === undefined) throw new Error('tagName must be explicitly set to a string or null')

    const renderFn: ComponentBwilderRenderer<RenderingContext, SubElements> = this.renderFn

    const builder = this
    const elementClass = class extends HTMLElement {

      readonly root: ShadowRoot | HTMLElement;
      subElements: SubElements = makeDefaultSubElements(builder.subElementNames) as SubElements
      state: StateRecord = {} as StateRecord
      private slotTracker = new Tracker<HTMLSlotElement>()
      private assignedTracker = new Tracker<HTMLElement>()
      private slotAddUnsub?: () => void
      private assignedAddUnsub?: () => void
      private _isConnected = false
      private postMountCleanup?: () => void

      constructor() {
        super()

        this.requestUpdate = this.requestUpdate.bind(this)

        if (builder.shadowDOM !== 'none')
          this.root = this.attachShadow({mode: builder.shadowDOM})
        else
          this.root = this as any

        // Initialize per-instance state from builder definitions
        const stateData: Record<string, unknown> = {}
        for (const [key, initialOrFactory] of Object.entries(builder.stateDefinitions)) {
          stateData[key] = typeof initialOrFactory === 'function'
            ? (initialOrFactory as () => unknown)()
            : initialOrFactory
        }
        const self = this
        ;(this as any).state = new Proxy(stateData, {
          set(target, prop, value) {
            target[prop as string] = value
            self.render()
            return true
          }
        })
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

      connectedCallback(): Promise<void> {
        const context = this as unknown as ComponentType
        return this.render()
          .then(() => builder.postMountFn?.call(context, context))
          .then((cleanup) => {
            if (typeof cleanup === 'function')
              this.postMountCleanup = cleanup
            this._isConnected = true
            this.refreshAssignedElements(context)
          })
      }

      disconnectedCallback() {
        this._isConnected = false
        this.postMountCleanup?.()
        this.postMountCleanup = undefined
        if (builder.slotAddedHandler)
          this.teardownSlotHandlers()
      }

      requestUpdate() {
        return this.render()
      }

      render(): Promise<void> {

        const context = this as unknown as RenderingContext
        const renderResult = renderFn.call(context, context)

        return Promise.resolve(renderResult)
          .then((returnedSubElements) => {
            this.subElements = normalizeSubElements(this.root, returnedSubElements, builder.subElementNames) as SubElements

            if (builder.slotAddedHandler)
              this.refreshSlotHandlers(context as unknown as ComponentType)

            if (builder.css) {
              const actualMode = resolveCSSMode(this.root, builder.css.requestedMode)

              if (actualMode !== builder.css.requestedMode && !gWarnedCSSFallback) {
                console.warn(
                  `[ComponentBwilder] CSS mode "${builder.css.requestedMode}" is not supported for this root. Falling back to "${actualMode}".`
                )
                gWarnedCSSFallback = true
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
          })
      }

      private refreshSlotHandlers(context: ComponentType) {
        const handler = builder.slotAddedHandler
        if (!handler)
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
        if (this._isConnected)
          this.refreshAssignedElements(context, slots)
      }

      private refreshAssignedElements(context: ComponentType, slots?: HTMLSlotElement[]) {
        const slotList = slots ?? Array.from(this.root.querySelectorAll('slot')) as HTMLSlotElement[]
        const assigned = slotList.flatMap((slot) => {
          const els = slot.assignedElements({flatten: true})
          return els.filter((n): n is HTMLElement => n instanceof HTMLElement)
        })
        this.assignedTracker.setAll(assigned)
      }

      private teardownSlotHandlers() {
        this.slotTracker.removeAll()

        this.assignedTracker.removeAll()
        if (this.assignedAddUnsub) this.assignedAddUnsub()
        this.assignedAddUnsub = undefined

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
  connectedCallback(): Promise<void>
  render(): Promise<void>
  requestUpdate(): Promise<void>
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


export function resetTest() {
  gWarnedCSSFallback = false
}