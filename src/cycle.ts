type BuiltInActionTypes = 'attribute-changed'

export interface State {
}

type StandardComponent<SubElementNames extends string = string> = HTMLElement | {
  attr(name: string): string;

  // Root of HTML, depending on whether shadowDOM is used
  get root(): ShadowRoot | HTMLElement

  // Utility for remembering elements between renders, ie. `renderState`
  get subElements(): { [K in SubElementNames]: HTMLElement }

  render(): void
}

interface EventResult<ActionTypes> extends CustomEventInit {
  type: ActionTypes,
  onHandled?: () => void,
  onNotHandled?: () => void
} // | ActionTypes | null

type GlobalEvents = keyof GlobalEventHandlersEventMap
type ActionFromEvent<ActionTypes extends string, Els extends string = string> = {
  [k in GlobalEvents]?:
  (this: StandardComponent<Els>, e: HTMLElementEventMap[DOMEvents])
    // (this: StandardComponent<Els>, e: GlobalEventHandlersEventMap[k])
    //(this: StandardComponent<Els>, e: Event)
    => EventResult<ActionTypes>
}

type View = string | null

type DOMEvents = keyof GlobalEventHandlersEventMap

type ActionResult = Promise<{ state?: State, publish?: CustomEvent }>

type SubElement = [string, string, ...Array<DOMEvents>]

type ComponentOptions<SubElementNames extends string, ActionTypes extends string> = {

  shadowDOM: 'open' | 'closed' | 'none',

  // Provide any attributes that should trigger an 'attribute-changed' event
  observedAttributes: string[],

  /*
    * Path to the CSS file for this component.
    * @see https://web.dev/articles/css-module-scripts
   */
  cssPath: string,

  renderDOM: (this: StandardComponent<SubElementNames>, state: State) => View,
  subElements?: Array<SubElement>
  detectIntent?: ActionFromEvent<ActionTypes, SubElementNames>,
  act: {
    [K in ActionTypes]:
    (this: StandardComponent<SubElementNames>, e: CustomEvent, state: State) => ActionResult
  },
}

// ********************************************************************************************************************
export function defineComponent<
  CustomActionTypes extends string = '',
  SubElementNames extends string = string,
  ActionTypes extends string = CustomActionTypes | BuiltInActionTypes
>(
  name: string,
  options: ComponentOptions<SubElementNames, ActionTypes>
): void {

  if (customElements.get(name)) throw `Custom element ${name} already defined.`
  if (!/-/.test(name)) throw "Custom element names must contain a hyphen."
  if (name !== name.toLowerCase()) throw "Custom element names must be lowercase."

  const elementClass = class extends HTMLElement {
    private root: ShadowRoot | HTMLElement;

    static get observedAttributes() {
      return options.observedAttributes
    }

    constructor() {
      super()
      if (options.shadowDOM !== 'none')
        this.root = this.attachShadow({mode: options.shadowDOM})
      else
        this.root = this
    }

    async connectedCallback() {
      this.render()
      await this.addStylesheet()

      // Listen for low-level events
      let eventType: DOMEvents
      for (eventType in options.detectIntent) {

        this.addEventListener(eventType, (e) => {

          const handler = options?.detectIntent?.[eventType]
          if (!handler) return

          let result = handler.call(this, e)

          if (result == null) return

          // if (typeof result === 'string')
          //   result = {type: result as ActionTypes}

          const {type, onHandled, onNotHandled, ...other} = result
          const customEvent = new CustomEvent(type, other)
          if (!customEvent.cancelable && (onHandled || onNotHandled))
            console.log(`Warning: cannot detect whether event \`${type}\` is handled unless \`cancelable\` is set to true.`)

          const handled = !this.dispatchEvent(customEvent)

          if (onHandled && handled) onHandled()
          if (onNotHandled && !handled) onNotHandled()
        })
      }

      // Listen for high-level events
      for (let action in (options.act || {})) {
        this.addEventListener(action, async (e) => {
          const actionFn = options.act[action as ActionTypes]
          const result = await actionFn.call(this, e as CustomEvent, {})
          e.preventDefault()

          if (result.publish)
            this.dispatchEvent(result.publish)
        })
      }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
      console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
      const e = new CustomEvent(
        'attribute-changed',
        {detail: {name, oldValue, newValue}})
      this.dispatchEvent(e)
    }

    private async addStylesheet() {
      if (!options.cssPath) return
      /*
      const cssModule = await import('./style.css', {
        assert: { type: 'css' }
      });
      document.adoptedStyleSheets = [cssModule.default];
      document.adoptedStyleSheets = [sheet];
      shadowRoot.adoptedStyleSheets = [sheet];
*/
      const style = document.createElement('style')
      style.textContent = await fetch(options.cssPath).then(r => r.text())
      this.shadowRoot!.appendChild(style)
    }

    render() {
      const view = options.renderDOM.call(this, {} as State)
      if (typeof view === 'string')
        this.root.innerHTML = view
      // todo, deal with css too
      // find all view elements
      // instrument view elements and events
    }
  }

  window.customElements.define(name, elementClass)
}


type RenderContext<
  SubElementNames extends string,
  AttributeNames extends string,
  State extends unknown> = {
  readonly root: HTMLElement,
  readonly state: State,
  readonly attrs: { [k in AttributeNames]: string }
  subEls: { [k in SubElementNames]: HTMLElement }
}
type Renderer<
  AttributeNames extends string,
  SubElementNames extends string,
  State = unknown,
  Context = RenderContext<SubElementNames, AttributeNames, State>
> = {
  renderDOM: (this: Context) => {
    html: string,
  }
  // Returns true if the DOM could be patched, or was "handled".
  // Returns false if the DOM needs to be re-rendered completely.
  patchDOM: (this: Context, changes: any) => boolean
}

// and actions are event listeners
// maybe patchDOM is just an event listener
