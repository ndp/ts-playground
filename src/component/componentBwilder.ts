import {type RenderContext, type SubElementInputMap, type SubElementsMap} from './render.ts'
import {type TagName, type TagNameLiteral} from './TagName.ts'
import {type ExtractFieldName, type OptionalIfNeeded, parseFieldName} from './element-name-parser.ts'
import {Tracker, type Prettify} from '@ndp-software/util'

type SubElementKeys<T extends SubElementsMap> = Extract<keyof T, string>
type BwilderRendererReturn<TSubElements extends SubElementsMap>
  = SubElementInputMap<SubElementKeys<TSubElements>> | void
type ComponentBwilderRenderer<TContext extends RenderContext, TSubElements extends SubElementsMap>
  = (this: TContext, context: TContext) => BwilderRendererReturn<TSubElements> | Promise<BwilderRendererReturn<TSubElements>>
type CSSMode = 'adopted' | 'inline'

type AttrChangeArgs<T = unknown> = {
  name: string
  newValue: T
  oldValue: T
  initial: boolean
}

type AttrParser<T> = (raw: string | null) => T

type AttrOptions<T> = {
  parse?: AttrParser<T>
  ifMissing?: T
}

type AttrBindOptions<TContext, T> = AttrOptions<T> & {
  handler: AttrChangeHandler<TContext, T>
  initial?: boolean
}

type AttrChangeHandler<TContext, TValue = unknown> = (this: TContext, args: AttrChangeArgs<TValue>) => void

type Cleanup = () => unknown | Promise<unknown>

type SlotAddedHandler<TContext> = <TEl extends HTMLElement>(
  this: TContext,
  context: TContext,
  slottedEl: TEl
) => any

let gWarnedCSSFallback = false
let gGeneratedTagCounter = 0

export class ComponentBwilder<
  SubElements extends SubElementsMap = {},
  StateRecord extends Record<string, unknown> = {},
  AttrsRecord extends {} = {},
  ComponentType extends RenderContext<{}, SubElementsMap> = Prettify<HTMLElement & RenderContext<AttrsRecord, SubElements, StateRecord> & {requestUpdate: () => void|Promise<void>}>> {

  private tagName?: string | null
  private css: { text: string, requestedMode: CSSMode } | undefined
  private shadowDOM: 'open' | 'closed' | 'none' = 'open'
  private observedAttrs: Record<string, AttrChangeHandler<ComponentType> | null> = {}
  private attrBindings: Record<string, {handler: AttrChangeHandler<ComponentType>, initial: boolean}> = {}
  private attrDefaults: Record<string, unknown> = {}
  private attrParsers: Record<string, AttrParser<unknown>> = {}
  private definedAttrs = new Set<string>()
  private requiredAttrs = new Set<string>()
  private unobservedAttrs = new Set<string>()
  private subElementDefinitions: Array<{name: string, required: boolean}> = []
  private stateDefinitions: Record<string, unknown | (() => unknown)> = {}
  private definedStates = new Set<string>()
  private renderFn: ComponentBwilderRenderer<ComponentType, SubElements> | undefined
  private postMountFn?: (this: ComponentType, context: ComponentType) => void | Cleanup | Promise<void | Cleanup>
  private postRenderFn?: (this: ComponentType, context: ComponentType) => void | Promise<void>
  private slotAddedHandler: SlotAddedHandler<ComponentType> | undefined

  /**
   * Generate a valid custom-element tag name that is currently unused.
   */
  static generateUniqueTagName(prefix = 'bwilder'): TagName {
    if (!/^[a-z][a-z0-9._-]*$/.test(prefix))
      throw new Error(`Invalid custom element tag prefix: "${prefix}"`)
    if (typeof customElements === 'undefined')
      throw new Error('Cannot generate a unique custom element tag name without customElements')

    let tagName: string
    do {
      gGeneratedTagCounter += 1
      const randomPart = Math.random().toString(36).slice(2, 10)
      tagName = `${prefix}-${Date.now().toString(36)}-${gGeneratedTagCounter.toString(36)}-${randomPart}`
    } while (customElements.get(tagName))

    return tagName as TagName
  }

  constructor() {
  }

  /**
   * Set the custom element tag name. Pass null to skip defining a custom element.
   */
  wTagName<T extends string>(tagName: TagNameLiteral<T> | TagName | null) {
    this.tagName = tagName
    return this as this & { wTagName: never }
  }


  /**
   * Set Shadow DOM mode for the component ('open', 'closed', 'none').
   */
  wShadowDOM(mode: typeof this.shadowDOM) {
    this.shadowDOM = mode
    return this as this & { wShadowDOM: never }
  }

  /**
   * Provide component CSS. `requestedMode` prefers 'adopted' (adoptedStyleSheets) or 'inline'.
   */
  wCSS(css: string, requestedMode: CSSMode = 'adopted') {
    this.css = {text: css, requestedMode}
    return this as this & { wCSS: never }
  }

  /**
   * Expose an attribute value on the component without observing changes.
   * Pass `{parse, ifMissing?}` to expose a parsed native value.
   */
  wAttr<A extends string, T>(
    attr: A,
    options: AttrOptions<T> = {}
  ): ComponentBwilder<
    SubElements,
    StateRecord,
    AttrsRecord & Record<ExtractFieldName<A>, T>
  > {
    const parsed = parseFieldName(attr)
    this.assertAttrNotDefined(parsed.name)
    this.definedAttrs.add(parsed.name)
    if (parsed.required)
      this.requiredAttrs.add(parsed.name)
    this.unobservedAttrs.add(parsed.name)
    if (options.parse)
      this.attrParsers[parsed.name] = options.parse as AttrParser<unknown>
    if (options.ifMissing !== undefined)
      this.attrDefaults[parsed.name] = options.ifMissing
    return this as unknown as ComponentBwilder<
      SubElements,
      StateRecord,
      AttrsRecord & Record<ExtractFieldName<A>, T>
    >;
  }

  /**
   * Observe an attribute and rerender the component whenever it changes.
   * Pass `{parse, ifMissing?}` to expose a parsed native value.
   */
  wAttrRender<A extends string, T>(
    attr: A,
    options: AttrOptions<T> = {}
  ): ComponentBwilder<
    SubElements,
    StateRecord,
    AttrsRecord & Record<ExtractFieldName<A>, T>
  > {
    const parsed = parseFieldName(attr)
    this.assertAttrNotDefined(parsed.name)
    this.definedAttrs.add(parsed.name)
    if (parsed.required)
      this.requiredAttrs.add(parsed.name)
    this.observedAttrs[parsed.name] = null
    if (options.parse)
      this.attrParsers[parsed.name] = options.parse as AttrParser<unknown>
    if (options.ifMissing !== undefined)
      this.attrDefaults[parsed.name] = options.ifMissing
    return this as unknown as ComponentBwilder<
      SubElements,
      StateRecord,
      AttrsRecord & Record<ExtractFieldName<A>, T>
    >;
  }

  /**
   * Observe an attribute and invoke a manual binding callback when it changes.
   * With `initial: true`, the callback also runs after the initial render on mount.
   * `options.parse` parses old and new values before invoking the callback.
   */
  wAttrBind<A extends string, T>(
    attr: A,
    options: AttrBindOptions<ComponentType, T>
  ): ComponentBwilder<
    SubElements,
    StateRecord,
    AttrsRecord & Record<ExtractFieldName<A>, T>
  > {
    const parsed = parseFieldName(attr)
    this.assertAttrNotDefined(parsed.name)
    this.definedAttrs.add(parsed.name)
    if (parsed.required)
      this.requiredAttrs.add(parsed.name)
    const {handler} = options
    this.observedAttrs[parsed.name] = handler as unknown as AttrChangeHandler<ComponentType>
    this.attrBindings[parsed.name] = {
      handler: handler as unknown as AttrChangeHandler<ComponentType>,
      initial: options.initial === true
    }
    if (options.parse)
      this.attrParsers[parsed.name] = options.parse as AttrParser<unknown>
    if (options.ifMissing !== undefined)
      this.attrDefaults[parsed.name] = options.ifMissing
    return this as unknown as ComponentBwilder<
      SubElements,
      StateRecord,
      AttrsRecord & Record<ExtractFieldName<A>, T>
    >
  }

  private assertAttrNotDefined(name: string) {
    if (this.definedAttrs.has(name))
      throw new Error(`Attr "${name}" is already defined.`)
  }

  /**
   * Declare a named sub-element returned by the render function.
   * Adds a typed key to `subElements` accessible in `this.subElements`.
   */
  wSubElement<A extends string, T extends HTMLElement = HTMLElement>(
    elementName: A,
    elementType?: new (...args: any[]) => T
  ) {
    const parsed = parseFieldName(elementName)
    if (this.subElementDefinitions.some((definition) => definition.name === parsed.name))
      throw new Error(`Sub-element "${parsed.name}" is already defined.`)
    this.subElementDefinitions.push({name: parsed.name, required: parsed.required})
    return this as unknown as ComponentBwilder<
      {[k in keyof SubElements]: SubElements[k]} & Record<ExtractFieldName<A>, OptionalIfNeeded<T, A>>,
      StateRecord,
      AttrsRecord
    >;
  }

  /**
   * Declare a typed per-instance field. `initial` may be a value or a factory called per instance.
   */
  wStateVar<N extends string, T>(name: N, initial: T | (() => T)) {
    const parsed = parseFieldName(name)
    if (this.definedStates.has(parsed.name))
      throw new Error(`State "${parsed.name}" is already defined.`)
    this.definedStates.add(parsed.name)
    this.stateDefinitions[parsed.name] = initial
    return this as unknown as ComponentBwilder<SubElements, StateRecord & Record<ExtractFieldName<N>, T>, AttrsRecord>
  }

  /**
   * Provide the render function. Called with the component context as `this` and `context`.
   */
  wRender(renderFn: ComponentBwilderRenderer<ComponentType, SubElements>) {
    this.renderFn = renderFn
    return this as this & { wRender: never };
  }

  /**
   * Run after the first render; may return a cleanup function or a Promise of one.
   */
  wConnectedFn(postMountFn: (this: ComponentType, context: ComponentType) => void | Cleanup | Promise<void | Cleanup>) {
    this.postMountFn = postMountFn as any
    return this as this & { wConnectedFn: never }
  }

  /**
   * Hook executed after each render; intended for side-effects.
   */
  wAfterUpdateFn(postRenderFn: (this: ComponentType & {render: never}, context: ComponentType & {requestUpdate: never}) => void | Promise<void>) {
    this.postRenderFn = postRenderFn as any
    return this as this & { wAfterUpdateFn: never }
  }

  /**
   * Register a handler invoked when slotted elements are added. Handler receives the component context and slotted element and may return a cleanup function.
   */
  wSlotAddedHandler(handler: SlotAddedHandler<ComponentType>) {
    this.slotAddedHandler = handler
    return this as this & { wSlotAddedHandler: never }

  }

  /**
   * Finalize the builder and return the constructed component class. Registers the tag if a tag name was provided.
   */
  bwild() {

    if (!this.renderFn) throw new Error('No render function provided to component')
    if (this.tagName === undefined) throw new Error('tagName must be explicitly set to a string or null')

    const renderFn: ComponentBwilderRenderer<ComponentType, SubElements> = this.renderFn

    const builder = this
    const elementClass = class extends HTMLElement {

      readonly root: ShadowRoot | HTMLElement;
      subElements: SubElements = makeDefaultSubElements(builder.subElementDefinitions) as SubElements
      state: StateRecord = {} as StateRecord
      private slotTracker = new Tracker<HTMLSlotElement>()
      private assignedTracker = new Tracker<HTMLElement>()
      private slotAddUnsub?: () => void
      private assignedAddUnsub?: () => void
      private _isConnected = false
      private postMountCleanup?: Cleanup

      private reportError(phase: string, error: unknown) {
        console.error(`[ComponentBwilder:${builder.tagName ?? 'unnamed'}] ${phase} failed`, error)
      }

      private runInternal(phase: string, operation: () => unknown) {
        try {
          Promise.resolve(operation()).catch((error) => this.reportError(phase, error))
        } catch (error) {
          this.reportError(phase, error)
        }
      }

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
        ;(this as any).state = stateData
      }

      static get observedAttributes() {
        return Object.keys(builder.observedAttrs);
      }

      attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        const action = builder.observedAttrs[name];
        if (action) {
          const binding = builder.attrBindings[name]
          if (!this._isConnected && binding?.initial)
            return
          this.runInternal('attributeChangedCallback', () => action.call(this as unknown as ComponentType, {
            name,
            oldValue: parseAttributeValue(oldValue, name, builder.attrDefaults, builder.attrParsers),
            newValue: parseAttributeValue(newValue, name, builder.attrDefaults, builder.attrParsers),
            initial: false
          }))
        } else
          this.runInternal('attributeChangedCallback render', () => this.render())
      }

      connectedCallback(): Promise<void> {
        const context = this as unknown as ComponentType
        return this.render()
          .then(() => this.validateRequiredAttributes())
          .then(() => this.runInitialAttrBindings(context))
          .then(() => builder.postMountFn?.call(context, context))
          .then(async (cleanup) => {
            if (typeof cleanup === 'function')
              this.postMountCleanup = cleanup
            this._isConnected = true
            await this.refreshAssignedElements(context)
          })
          .catch((error) => {
            this.reportError('connectedCallback', error)
          })
      }

      disconnectedCallback() {
        this._isConnected = false
        const cleanup = this.postMountCleanup
        this.postMountCleanup = undefined
        if (cleanup)
          this.runInternal('disconnectedCallback cleanup', cleanup)
        if (builder.slotAddedHandler)
          this.teardownSlotHandlers()
      }

      requestUpdate() {
        return this.render()
      }

      private validateRequiredAttributes() {
        for (const name of builder.requiredAttrs) {
          if (!this.hasAttribute(name))
            throw new Error(`Required attribute "${name}" is missing.`)
        }
      }

      render(): Promise<void> {

        const context = this as unknown as ComponentType
        let renderResult: BwilderRendererReturn<SubElements> | Promise<BwilderRendererReturn<SubElements>>
        try {
          renderResult = renderFn.call(context, context)
        } catch (error) {
          return Promise.reject(error)
        }

        return Promise.resolve(renderResult)
          .then(async (returnedSubElements) => {
            this.subElements = normalizeSubElements(this.root, returnedSubElements, builder.subElementDefinitions) as SubElements

            if (builder.slotAddedHandler)
              await this.refreshSlotHandlers(context as unknown as ComponentType)

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
              await builder.postRenderFn.call(context as any, context as any)
          })
      }

      private async refreshSlotHandlers(context: ComponentType) {
        const handler = builder.slotAddedHandler
        if (!handler)
          return

        if (!this.slotAddUnsub)
          this.slotAddUnsub = this.slotTracker.onAdd((slotEl) => {
            const listener = () => this.runInternal('slotchange', () => this.refreshAssignedElements(context))
            slotEl.addEventListener('slotchange', listener)
            return () => slotEl.removeEventListener('slotchange', listener)
          })

        if (!this.assignedAddUnsub)
          this.assignedAddUnsub = this.assignedTracker.onAdd((assignedEl) => {
            try {
              return handler.call(context, context, assignedEl)
            } catch (error) {
              console.error(`[ComponentBwilder:${this.tagName ?? 'unnamed'}] slotAddedHandler failed for assigned element`, error)
              throw error
            }
          })

        const slots = Array.from(this.root.querySelectorAll('slot')) as HTMLSlotElement[]
        const trackedSlots = this._isConnected && this.slotTracker.size > 0 && slots.length === this.slotTracker.size
          ? Array.from(this.slotTracker)
          : slots

        this.slotTracker.setAll(trackedSlots)
        if (this._isConnected)
          await this.refreshAssignedElements(context, trackedSlots)
      }

      private async refreshAssignedElements(context: ComponentType, slots?: HTMLSlotElement[]) {
        const handler = builder.slotAddedHandler
        if (!handler)
          return

        const slotList = slots ?? Array.from(this.root.querySelectorAll('slot')) as HTMLSlotElement[]
        const assigned = slotList.flatMap((slot) => {
          const els = slot.assignedElements({flatten: true})
          return els.filter((n): n is HTMLElement => n instanceof HTMLElement)
        })

        this.assignedTracker.setAll(assigned)
        const errors = await this.assignedTracker.flushPendingAsyncResults()
        if (errors.length > 0) {
          throw new AggregateError(
            errors,
            `[ComponentBwilder:${this.tagName ?? 'unnamed'}] slotAddedHandler failed for ${errors.length} assigned element(s)`
          )
        }
      }

      private runInitialAttrBindings(context: ComponentType) {
        for (const [name, binding] of Object.entries(builder.attrBindings)) {
          if (!binding.initial)
            continue
          binding.handler.call(context, {
            name,
            newValue: readAttribute(this, name, builder.attrDefaults, builder.attrParsers),
            oldValue: parseAttributeValue(null, name, builder.attrDefaults, builder.attrParsers),
            initial: true
          })
        }
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
          return readAttribute(this, a, builder.attrDefaults, builder.attrParsers)
        },
        enumerable: true,
        configurable: true
      });

    for (const a of builder.unobservedAttrs)
      if (!(a in builder.observedAttrs))
        Object.defineProperty(elementClass.prototype, a, {
          get: function (this: HTMLElement) {
            return readAttribute(this, a, builder.attrDefaults, builder.attrParsers)
          },
          enumerable: true,
          configurable: true
        });

    if (this.tagName !== null)
      customElements.define(this.tagName, elementClass)

    return elementClass as unknown as ConstructorOf<BuiltComponentInstance<ComponentType, SubElements>>
  }
}

type ConstructorOf<T> = new (...args: any[]) => T;
type BuiltComponentInstance<
  TComponent,
  TSubElements extends SubElementsMap
> = Prettify<TComponent & HTMLElement & {
  connectedCallback(): Promise<void>
  render(): Promise<void>
  requestUpdate(): Promise<void>
  disconnectedCallback(): void
  root: ShadowRoot | HTMLElement
  subElements: TSubElements
}>

type AdoptedStylesHost = {
  adoptedStyleSheets: CSSStyleSheet[]
}

function readAttribute(
  element: HTMLElement,
  name: string,
  defaults: Record<string, unknown>,
  parsers: Record<string, AttrParser<unknown>>
) {
  return parseAttributeValue(element.getAttribute(name), name, defaults, parsers)
}

function parseAttributeValue(
  raw: string | null,
  name: string,
  defaults: Record<string, unknown>,
  parsers: Record<string, AttrParser<unknown>>
) {
  if (raw === null && name in defaults)
    return defaults[name]
  const parse = parsers[name]
  return parse ? parse(raw) : raw
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

type SubElementDefinition = {name: string, required: boolean}

function makeDefaultSubElements(definitions: SubElementDefinition[]) {
  const subElements: Record<string, HTMLElement | null> = {}
  for (const {name} of definitions)
    subElements[name] = null
  return subElements
}

function normalizeSubElements(root: ShadowRoot | HTMLElement,
                              rawSubElements: unknown,
                              definitions: SubElementDefinition[]): SubElementsMap<string> {
  const normalized = makeDefaultSubElements(definitions)
  const requiredByName = new Map(definitions.map(({name, required}) => [name, required]))
  const returned = rawSubElements && typeof rawSubElements === 'object'
    ? rawSubElements as Record<string, unknown>
    : {}

  for (const {name, required} of definitions) {
    const value = returned[name]
    let element: HTMLElement | null = null

    if (typeof value === 'string')
      element = root.querySelector(value)
    else if (value === null || value instanceof HTMLElement)
      element = value

    if (required && !element) {
      const detail = name in returned
        ? `returned value ${describeSubElementValue(value)}`
        : 'no value was returned'
      throw new Error(`Required sub-element "${name}" was not found: ${detail}.`)
    }

    normalized[name] = element
  }

  for (const [key, value] of Object.entries(returned)) {
    if (requiredByName.has(key))
      continue
    if (typeof value === 'string')
      normalized[key] = root.querySelector(value)
    else if (value === null || value instanceof HTMLElement)
      normalized[key] = value
    else
      normalized[key] = null
  }

  return normalized
}

function describeSubElementValue(value: unknown): string {
  if (typeof value === 'string')
    return `selector "${value}"`
  if (value === null)
    return 'null'
  if (value === undefined)
    return 'undefined'
  return `value of type ${typeof value}`
}


export function resetTest() {
  gWarnedCSSFallback = false
}