import {defineComponent, State} from "./cycle.js";


defineComponent<'change'>('my-component',
  {
    shadowDOM: 'open',
    cssPath: 'my-component.css',
    renderDOM(state: State) {
      return `<div>Hello World</div>`
    },
    detectIntent: {
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


