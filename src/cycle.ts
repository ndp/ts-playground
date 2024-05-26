defineComponent<'change'>('my-component',
  {
    shadowDOM: 'open',
    cssPath: 'my-component.css',
    renderDOM() {
      return `<div>Hello World</div>`
    },
    triageUserInput: {
      click: function (e) {
        return {
          type: 'change', detail: {}
        }
      }
    },
    act: {
      'observed-attribute-changed': async function () {
        return {publish: new CustomEvent('foo')}
      },
      change: async function () {
        return {publish: new CustomEvent('foo')}
      }
    },
    observedAttributes: ['foo', 'bar']
  })


type BuiltInActionTypes = 'observed-attribute-changed'

interface State {
}

type StandardComponent<Els extends string = string> = HTMLElement | {
  attr(name: string): string

  // Root of HTML, depending on whether shadowDOM is used
  get root(): ShadowRoot | HTMLElement

  // Utility for remembering elements between renders, ie. `renderState`
  get els(): { [K in Els]: HTMLElement }

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

type DOMEvents = keyof GlobalEventHandlersEventMap

type ActionResult = Promise<{ state?: State, publish?: CustomEvent }>

function defineComponent<
  CustomActionTypes extends string = '',
  Els extends string = string,
  ActionTypes extends string = CustomActionTypes | BuiltInActionTypes
>(
  name: string,
  options:
    {
      shadowDOM: 'open' | 'closed' | 'none',
      cssPath: string,
      renderDOM: (this: StandardComponent<Els> /*, state: State */) => string,
      triageUserInput: ActionFromEvent<ActionTypes, Els>,
      act: {
        [K in ActionTypes]:
        (this: StandardComponent<Els>, e?: CustomEvent/*, state: State*/) => ActionResult
      },
      act2?: {
        [K in CustomActionTypes]:
        (this: StandardComponent<Els>, e?: CustomEvent/*, state: State*/) => ActionResult
      } & {
        [K in BuiltInActionTypes]?:
        (this: StandardComponent<Els>, e?: CustomEvent/*, state: State*/) => ActionResult
      },
      observedAttributes: string[]
    }
): void {

  if (customElements.get(name)) throw `Custom element ${name} already defined.`
  if (!/-/.test(name)) throw "Custom element names must contain a hyphen."
  if (name !== name.toLowerCase()) throw "Custom element names must be lowercase."

  window.customElements.define(name, class extends HTMLElement {
      static get observedAttributes() {
        return options.observedAttributes
      }

      constructor() {
        super()
        if (options.shadowDOM !== 'none')
          this.attachShadow({mode: options.shadowDOM})
      }

      async connectedCallback() {
        this.render()
        await this.addStylesheet()

        // Listen for low-level events
        let eventType: DOMEvents
        for (eventType in options.triageUserInput) {

          this.addEventListener(eventType, (e) => {

            const handler = options.triageUserInput[eventType]
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
            const result = await actionFn.call(this, e as CustomEvent)
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
        const style = document.createElement('style')
        style.textContent = await fetch(options.cssPath).then(r => r.text())
        this.shadowRoot!.appendChild(style)
      }

      render() {
        this.shadowRoot!.innerHTML = options.renderDOM.call(this /* , {} as State */)
      }
    }
  )
}
