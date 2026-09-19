import {
  ComponentBwilder, resetTest
} from './componentBwilder.ts'
import {type TagName} from './TagName.ts'
import {describe, test} from 'node:test'
import {strict as assert} from 'node:assert'
import {type RenderContext} from './render.ts'

function nextTag(prefix: string): TagName {
  return ComponentBwilder.generateUniqueTagName(prefix)
}

// Typescript tests: prevent duplicate calls

// @ts-expect-error
new ComponentBwilder().wTagName('another-component').wTagName('another-component')

// @ts-expect-error
new ComponentBwilder().wCSS('.my-class { color: blue; }').wCSS('.my-class { color: blue; }')

// @ts-expect-error
new ComponentBwilder().wShadowDOM('open').wShadowDOM('open')

// @ts-expect-error intentional duplicate post-mount registration
new ComponentBwilder().wConnectedFn(() => {}).wConnectedFn(() => {})

// @ts-expect-error intentional duplicate post-render registration
new ComponentBwilder().wAfterUpdateFn(() => {}).wAfterUpdateFn(() => {})


const stubRender = function (this: RenderContext) {
  this.root.innerHTML = '<div>Stub</div>'
}

describe('ComponentBwilder basic tests', () => {
  test('throws when tagName not explicitly set', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wShadowDOM('none')
        .wRender(stubRender)
        .bwild()
    }, /tagName must be explicitly set/)
  })
})


describe('ComponentBwilder tag names', () => {
  test('generates valid unused tag names', () => {
    const first = ComponentBwilder.generateUniqueTagName('test-widget')
    const second = ComponentBwilder.generateUniqueTagName('test-widget')

    assert.notEqual(first, second)
    assert.match(first, /^test-widget-[a-z0-9-]+$/)
    assert.equal(customElements.get(first), undefined)

    const Component = new ComponentBwilder()
      .wTagName(first)
      .wRender(stubRender)
      .bwild()

    assert.equal(customElements.get(first), Component)
    assert.notEqual(ComponentBwilder.generateUniqueTagName('test-widget'), first)
  })

  test('rejects invalid tag-name prefixes', () => {
    assert.throws(() => ComponentBwilder.generateUniqueTagName('Invalid Prefix'), /Invalid custom element tag prefix/)
  })
})

describe('ComponentBwilder observed attributes', () => {
  test('wAttr parses attribute values into the inferred native type', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('parsed-attribute'))
      .wShadowDOM('none')
      .wAttr('data-count', {
        ifMissing: 0,
        parse: (raw) => {
          if (raw === null) throw new Error('parse should not receive missing values')
          return Number(raw)
        }
      })
      .wRender(function () {
        const count: number = this['data-count']
        // @ts-expect-error parsed attributes are not strings
        this['data-count'].toUpperCase()
        this.root.textContent = String(count)
      })
      .bwild()

    const c = new MyComponentClass()
    assert.equal(c['data-count'], 0)

    c.setAttribute('data-count', '42')
    assert.equal(c['data-count'], 42)
  })

  test('wAttrRender reparses values before rendering', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('parsed-render-attribute'))
      .wShadowDOM('none')
      .wAttrRender('data-count', {
        parse: (raw) => raw === null ? 0 : Number(raw)
      })
      .wRender(function () {
        const count: number = this['data-count']
        const expectNumber = (value: number) => {
          // @ts-expect-error parsed attributes are not strings
          value.trim()
        }
        void expectNumber
        this.root.textContent = String(count * 2)
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.equal(c.textContent, '0')

    c.setAttribute('data-count', '21')
    await Promise.resolve()
    assert.equal(c.textContent, '42')
  })

  test('wAttrBind receives parsed values for initial, changed, and removed attributes', async () => {
    const transitions: Array<{oldValue: number, newValue: number, initial: boolean}> = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('parsed-bound-attribute'))
      .wAttrBind('data-count', {
        handler({oldValue, newValue, initial}) {
          const oldCount: number = oldValue
          const newCount: number = newValue
          transitions.push({oldValue: oldCount, newValue: newCount, initial})
        },
        ifMissing: 0,
        initial: true,
        parse: (raw) => Number(raw)
      })
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    c.setAttribute('data-count', '12')
    c.removeAttribute('data-count')

    assert.deepEqual(transitions, [
      {oldValue: 0, newValue: 0, initial: true},
      {oldValue: 0, newValue: 12, initial: false},
      {oldValue: 12, newValue: 0, initial: false}
    ])
  })

  test('basic definition', () => {
    const MyBuilder =
      new ComponentBwilder()
        .wTagName(nextTag('observed-attrs-component'))
        .wAttrBind('data-id', {
          handler({newValue, oldValue}) {
            console.log(`data-id changed from ${oldValue} to ${newValue}`)
          }
        })
        .wAttrRender('role')
        .wRender(stubRender)

    const MyComponent = MyBuilder.bwild()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) throw new Error('Component is not an instance of HTMLElement')

    c.setAttribute('data-id', '123')
    c.setAttribute('role', 'admin')
  })

  test('throws when the same attribute is defined more than once', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wTagName(nextTag('duplicate-attr'))
        .wAttr('data-id')
        .wAttrBind('data-id', {handler() {}})
    }, /Attr "data-id" is already defined\./)

    assert.throws(() => {
      new ComponentBwilder()
        .wTagName(nextTag('duplicate-observed-attr'))
        .wAttrRender('data-id')
        .wAttr('data-id')
    }, /Attr "data-id" is already defined\./)
  })

  test('internally triggered attribute render failures are logged', async () => {
    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => errors.push(args)
    try {
      const MyComponentClass = new ComponentBwilder()
        .wTagName(nextTag('attribute-render-error'))
        .wAttrRender('data-value')
        .wRender(function () {
          throw new Error('attribute render failed')
        })
        .bwild()
      const c = new MyComponentClass()
      c.setAttribute('data-value', 'x')
      await Promise.resolve()
      assert.match(String(errors[0]?.[0]), /ComponentBwilder:.*attributeChangedCallback render failed/)
      assert.match(String(errors[0]?.[1]), /attribute render failed/)
    } finally {
      console.error = originalError
    }
  })

  test('callback receives null when observed attribute is removed', () => {
    const transitions: Array<{ oldValue: unknown, newValue: unknown }> = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('observed-attrs-remove'))
      .wAttrBind('data-id', {
        handler({oldValue, newValue}) {
          transitions.push({oldValue, newValue})
        }
      })
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-id', '7')
    c.removeAttribute('data-id')

    assert.deepEqual(transitions, [
      {oldValue: null, newValue: '7'},
      {oldValue: '7', newValue: null}
    ])
  })
})


describe('ComponentBwilder render', () => {
  test('with render function', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('rendered-component-with-render-fn'))
      .wShadowDOM('none')
      .wRender(function (this: RenderContext) {
        this.root.innerHTML = '<div class="content">Hello, world!</div>'
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()
    const contentDiv = c.querySelector('.content')
    assert.ok(contentDiv, 'Content div should exist')
    assert.equal(contentDiv!.innerHTML, 'Hello, world!', 'Content div should have correct content')
  })

  test('without render function', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wTagName(nextTag('rendered-component-without-render-fn'))
        .wShadowDOM('none')
        .bwild()
    }, /No render function provided to component/)
  })

  test('render function receives unobserved attribute value', () => {
    let unobservedValue: string | null = null;

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('rendered-component-with-unobs-attr'))
      .wShadowDOM('none')
      .wAttr('data-info', {parse: raw => raw})
      .wRender(function () {
        unobservedValue = this['data-info']
        this.root.innerHTML = `<div>Info: ${unobservedValue}</div>`;
      })
      .bwild();

    const c = new MyComponentClass();
    c.setAttribute('data-info', 'some info');

    c.connectedCallback()

    const contentDiv = c.querySelector('div')
    assert.equal(contentDiv!.innerHTML, 'Info: some info', 'Content div should have correct content')

    c.setAttribute('data-info', 'other info');

    const contentDiv2 = c.querySelector('div')
    assert.equal(contentDiv2!.innerHTML, 'Info: some info', 'Content div should not change automatically')

    // Re-render manually since attribute is unobserved
    c.render();
    const contentDiv3 = c.querySelector('div')
    assert.equal(contentDiv3!.innerHTML, 'Info: other info', 'Content div should have updated content')
  })


  test('unobserved attribute value is null if not set', () => {

    let unobservedValue: string | null = 'initial';

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('rendered-component-with-unobs-attr-null'))
      .wShadowDOM('none')
      .wAttr('data-info', {parse: raw => raw})
      .wRender(function () {
        unobservedValue = this['data-info']
        this.root.innerHTML = `<div>Info: ${unobservedValue}</div>`;
      })
      .bwild();

    const c = new MyComponentClass();
    // Note: not setting data-info attribute

    c.connectedCallback()

    const contentDiv = c.querySelector('div')
    assert.equal(contentDiv!.innerHTML, 'Info: null', 'Content div should show null for unset attribute')
  })

  test('unobserved attribute can have default value', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('rendered-component-with-unobs-attr-default'))
      .wShadowDOM('none')
      .wAttr('data-info', {ifMissing: 'a default value'})
      .wRender(function () {
        this.root.innerHTML = `<div>Info: ${this['data-info']}</div>`;
      })
      .bwild();
    const c = new MyComponentClass();
    // Note: not setting data-info attribute

    c.connectedCallback()

    const contentDiv = c.querySelector('div')
    assert.equal(contentDiv!.innerHTML, 'Info: a default value', 'Content div should show default value for unset attribute')
  })

  test('unobserved attribute uses empty string over default and falls back after removal', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('rendered-component-with-empty-string-default'))
      .wShadowDOM('none')
      .wAttr('data-info', {ifMissing: 'fallback-default'})
      .wRender(function () {
        this.root.innerHTML = `<div>Info: ${this['data-info']}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()
    assert.equal(c.querySelector('div')!.innerHTML, 'Info: fallback-default')

    c.setAttribute('data-info', '')
    c.render()
    assert.equal(c.querySelector('div')!.innerHTML, 'Info: ')

    c.removeAttribute('data-info')
    c.render()
    assert.equal(c.querySelector('div')!.innerHTML, 'Info: fallback-default')
  })

  test('render function receives observed attribute value', () => {
    let observedValue: string | null = null;

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('rendered-component-with-attr'))
      .wShadowDOM('none')
      .wAttrRender('data-name', {parse: raw => raw})
      .wRender(function () {
        observedValue = this['data-name']
        this.root.innerHTML = `<div>Hello, ${observedValue}</div>`;
      })
      .bwild();

    const c = new MyComponentClass();
    c.setAttribute('data-name', 'world!');

    c.connectedCallback()

    const contentDiv = c.querySelector('div')
    assert.equal(contentDiv!.innerHTML, 'Hello, world!', 'Content div should have correct content')

    c.setAttribute('data-name', 'Frank');
    const contentDiv2 = c.querySelector('div')
    assert.equal(contentDiv2!.innerHTML, 'Hello, Frank', 'Content div should have updated content')
  })

  test('defaults to adopted CSS mode in open shadow DOM', async () => {
    const css = `.test-class { color: red; }`;
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('styled-component'))
      .wShadowDOM('open')
      .wCSS(css)
      .wRender(function (this: RenderContext) {
        this.root.innerHTML = '<div class="test-class">Styled Text</div>';
      })
      .bwild();

    const c = new MyComponentClass();
    await c.connectedCallback();

    const shadowRoot = c.shadowRoot;
    assert.ok(shadowRoot, 'Shadow root should exist');

    const styleElement = shadowRoot!.querySelector('style');
    assert.equal(styleElement, null, 'Style element should not be injected in adopted mode');

    const adoptedSheets = (shadowRoot! as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets
    assert.equal(adoptedSheets.length, 1, 'One adopted stylesheet should be attached')
  })

  test('observedAttributes include only observed attrs in order', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('observed-order'))
      .wAttrRender('data-first')
      .wAttrRender('data-second')
      .wAttr('data-unobserved')
      .wRender(stubRender)
      .bwild()

    assert.deepEqual((MyComponentClass as unknown as { observedAttributes: string[] }).observedAttributes,
      ['data-first', 'data-second'])
  })

  test('observed attr with callback does not auto-render', () => {
    let renderCount = 0
    let callbackCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('obs-callback-no-rerender'))
      .wShadowDOM('none')
      .wAttrBind('data-id', {
        handler() {
          callbackCount += 1
        }
      })
      .wRender(function () {
        renderCount += 1
        this.root.innerHTML = `<div>${renderCount}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    const assignedEl = document.createElement('div')
    c.setAttribute('data-id', '123')
    assert.equal(callbackCount, 1)
    assert.equal(renderCount, 1)
    assert.equal(c.querySelector('div')!.innerHTML, '1')
  })

  test('render receives context as first argument', () => {
    let sameContextObject = false

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('render-context-arg'))
      .wShadowDOM('none')
      .wAttrRender('data-name')
      .wRender(function (context) {
        sameContextObject = this === context
        this.root.innerHTML = `<div>${context['data-name'] ?? 'none'}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-name', 'ArgStyle')
    c.connectedCallback()

    assert.equal(sameContextObject, true)
    assert.equal(c.querySelector('div')!.innerHTML, 'ArgStyle')
  })

  test('render supports destructured first-argument context', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('render-context-destructure'))
      .wShadowDOM('none')
      .wAttrRender('data-name')
      .wRender(function ({root, 'data-name': dataName}) {
        root.innerHTML = `<div>${dataName ?? 'none'}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-name', 'DestructureStyle')
    c.connectedCallback()

    assert.equal(c.querySelector('div')!.innerHTML, 'DestructureStyle')
  })

  test('wConnectedFn runs once after initial render', async () => {
    const events: string[] = []
    let mountCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('post-mount'))
      .wShadowDOM('none')
      .wAttrRender('data-v')
      .wRender(function () {
        events.push('render')
        this.root.innerHTML = `<div>${this['data-v'] ?? 'init'}</div>`
      })
      .wConnectedFn(function (c) {
        mountCount += 1
        events.push('postMount')
        assert.equal(this, c)
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(mountCount, 1)
    assert.deepEqual(events, ['render', 'postMount'])

    c.setAttribute('data-v', 'next')

    assert.equal(mountCount, 1)
    assert.deepEqual(events, ['render', 'postMount', 'render'])
  })

  test('wAfterUpdateFn runs after every render', async () => {
    let renderCount = 0
    let postRenderCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('post-render'))
      .wShadowDOM('none')
      .wAttrRender('data-v')
      .wRender(function () {
        renderCount += 1
        this.root.innerHTML = `<div>${this['data-v'] ?? 'init'}</div>`
      })
      .wAfterUpdateFn(function (c) {
        postRenderCount += 1
        assert.equal(this, c)
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.equal(renderCount, 1)
    assert.equal(postRenderCount, 1)

    c.setAttribute('data-v', 'next')
    await Promise.resolve() // yield to microtasks: flush the render triggered by setAttribute
    assert.equal(renderCount, 2)
    assert.equal(postRenderCount, 2)

    await c.render()
    assert.equal(renderCount, 3)
    assert.equal(postRenderCount, 3)
  })

  test('wAfterUpdateFn supports destructured first-argument context', async () => {
    let lastText = ''

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('post-render-context-destructure'))
      .wShadowDOM('none')
      .wAttrRender('data-v')
      .wRender(function ({root, 'data-v': dataV}) {
        root.innerHTML = `<div>${dataV ?? 'init'}</div>`
      })
      .wAfterUpdateFn(function ({root}) {
        lastText = root!.querySelector('div')!.textContent ?? ''
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.equal(lastText, 'init')

    c.setAttribute('data-v', 'next')
    await Promise.resolve() // yield to microtasks: flush the render triggered by setAttribute
    assert.equal(lastText, 'next')
  })

  test('render() returns a Promise when renderFn is async and there is no postRenderFn', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('async-render-no-postrender'))
      .wShadowDOM('none')
      .wRender(async function () {
        await Promise.resolve()
        this.root.innerHTML = '<div>async-done</div>'
      })
      .bwild()

    const c = new MyComponentClass()
    const promise = c.render()

    assert.ok(promise instanceof Promise, 'render should return a Promise')
    assert.equal(c.querySelector('div'), null, 'should not be rendered yet')

    await promise

    assert.equal(c.querySelector('div')!.textContent, 'async-done')
  })

  test('render() returns a Promise and runs postRenderFn after async renderFn', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('async-render-sync-postrender'))
      .wShadowDOM('none')
      .wRender(async function () {
        events.push('render-start')
        await Promise.resolve()
        this.root.innerHTML = '<div>ready</div>'
        events.push('render-end')
      })
      .wAfterUpdateFn(function () {
        events.push('postRender')
      })
      .bwild()

    const c = new MyComponentClass()
    const promise = c.render()

    assert.ok(promise instanceof Promise, 'render should return a Promise')
    assert.deepEqual(events, ['render-start'])

    await promise

    assert.deepEqual(events, ['render-start', 'render-end', 'postRender'])
  })

  test('supports async render and async post hooks', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('async-lifecycle'))
      .wShadowDOM('none')
      .wRender(async function ({root}) {
        events.push('render-start')
        await Promise.resolve()
        root.innerHTML = '<div>async ready</div>'
        events.push('render-end')
      })
      .wAfterUpdateFn(async function ({root}) {
        events.push('postRender-start')
        await Promise.resolve()
        const txt = root.querySelector('div')!.textContent
        events.push(`postRender-end:${txt}`)
      })
      .wConnectedFn(async function ({root}) {
        events.push('postMount-start')
        await Promise.resolve()
        const txt = root.querySelector('div')!.textContent
        events.push(`postMount-end:${txt}`)
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.deepEqual(events, [
      'render-start',
      'render-end',
      'postRender-start',
      'postRender-end:async ready',
      'postMount-start',
      'postMount-end:async ready'
    ])
  })

  test('render returns promise when postRenderFn is async', async () => {
    let postRenderDone = false

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('async-post-render-only'))
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>ready</div>'
      })
      .wAfterUpdateFn(async function () {
        await Promise.resolve()
        postRenderDone = true
      })
      .bwild()

    const c = new MyComponentClass()
    await c.render()

    assert.equal(postRenderDone, true)
  })

  test('connectedCallback logs and resolves when async render rejects', async () => {
    let postMountCalled = false
    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => errors.push(args)

    try {
      const MyComponentClass = new ComponentBwilder()
        .wTagName(nextTag('async-render-reject'))
        .wShadowDOM('none')
        .wRender(async function () {
          await Promise.resolve()
          throw new Error('render failed')
        })
        .wConnectedFn(function () {
          postMountCalled = true
        })
        .bwild()

      const c = new MyComponentClass()
      await c.connectedCallback()
      assert.equal(postMountCalled, false)
      assert.match(String(errors[0]?.[0]), /ComponentBwilder:.*connectedCallback failed/)
      assert.match(String(errors[0]?.[1]), /render failed/)
    } finally {
      console.error = originalError
    }
  })

  test('render rejects when postRenderFn rejects', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('async-post-render-reject'))
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>ready</div>'
      })
      .wAfterUpdateFn(async function () {
        await Promise.resolve()
        throw new Error('postRender failed')
      })
      .bwild()

    const c = new MyComponentClass()
    await assert.rejects(() => Promise.resolve(c.render()), /postRender failed/)
  })

  test('connectedCallback logs and resolves when postMountFn rejects', async () => {
    let renderCompleted = false
    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => errors.push(args)

    try {
      const MyComponentClass = new ComponentBwilder()
        .wTagName(nextTag('async-post-mount-reject'))
        .wShadowDOM('none')
        .wRender(function () {
          renderCompleted = true
          this.root.innerHTML = '<div>ready</div>'
        })
        .wConnectedFn(async function () {
          await Promise.resolve()
          throw new Error('postMount failed')
        })
        .bwild()

      const c = new MyComponentClass()
      await c.connectedCallback()
      assert.equal(renderCompleted, true)
      assert.match(String(errors[0]?.[0]), /ComponentBwilder:.*connectedCallback failed/)
      assert.match(String(errors[0]?.[1]), /postMount failed/)
    } finally {
      console.error = originalError
    }
  })

  test('connectedCallback returns a Promise when async render + sync postMountFn', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('async-render-sync-postmount'))
      .wShadowDOM('none')
      .wRender(async function () {
        events.push('render-start')
        await Promise.resolve()
        this.root.innerHTML = '<div>ready</div>'
        events.push('render-end')
      })
      .wConnectedFn(function () {
        events.push('postMount')
      })
      .bwild()

    const c = new MyComponentClass()
    const promise = c.connectedCallback()

    assert.ok(promise instanceof Promise, 'connectedCallback should return a Promise')
    assert.deepEqual(events, ['render-start'])

    await promise

    assert.deepEqual(events, ['render-start', 'render-end', 'postMount'])
  })

  test('connectedCallback returns a Promise when async render + no postMountFn', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('async-render-no-postmount'))
      .wShadowDOM('none')
      .wRender(async function () {
        events.push('render-start')
        await Promise.resolve()
        this.root.innerHTML = '<div>ready</div>'
        events.push('render-end')
      })
      .bwild()

    const c = new MyComponentClass()
    const promise = c.connectedCallback()

    assert.ok(promise instanceof Promise, 'connectedCallback should return a Promise')
    assert.deepEqual(events, ['render-start'])

    await promise

    assert.deepEqual(events, ['render-start', 'render-end'])
    assert.equal(c.querySelector('div')!.textContent, 'ready')
  })

  test('connectedCallback returns a Promise when sync render + async postMountFn', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('sync-render-async-postmount'))
      .wShadowDOM('none')
      .wRender(function () {
        events.push('render')
        this.root.innerHTML = '<div>ready</div>'
      })
      .wConnectedFn(async function () {
        events.push('postMount-start')
        await Promise.resolve()
        events.push('postMount-end')
      })
      .bwild()

    const c = new MyComponentClass()
    const promise = c.connectedCallback()

    assert.deepEqual(events, ['render'])
    assert.ok(promise instanceof Promise, 'connectedCallback should return a Promise')

    await promise

    assert.deepEqual(events, ['render', 'postMount-start', 'postMount-end'])
  })

  test('sync render and post-hook failures follow the error policy', async () => {
    const RenderThrowsClass = new ComponentBwilder()
      .wTagName(nextTag('sync-render-throw'))
      .wShadowDOM('none')
      .wRender(function () {
        throw new Error('render sync failed')
      })
      .bwild()

    const c1 = new RenderThrowsClass()
    const renderErrors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => renderErrors.push(args)
    await c1.connectedCallback()
    console.error = originalError
    assert.match(String(renderErrors[0]?.[0]), /ComponentBwilder:.*connectedCallback failed/)
    assert.match(String(renderErrors[0]?.[1]), /render sync failed/)

    const PostRenderThrowsClass = new ComponentBwilder()
      .wTagName(nextTag('sync-post-render-throw'))
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>ok</div>'
      })
      .wAfterUpdateFn(function () {
        throw new Error('postRender sync failed')
      })
      .bwild()

    const c2 = new PostRenderThrowsClass()
    await assert.rejects(
      () => c2.render(),
      /postRender sync failed/
    )

    const PostMountThrowsClass = new ComponentBwilder()
      .wTagName(nextTag('sync-post-mount-throw'))
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>ok</div>'
      })
      .wConnectedFn(function () {
        throw new Error('postMount sync failed')
      })
      .bwild()

    const c3 = new PostMountThrowsClass()
    const postMountErrors: unknown[][] = []
    console.error = (...args: unknown[]) => postMountErrors.push(args)
    await c3.connectedCallback()
    console.error = originalError
    assert.match(String(postMountErrors[0]?.[0]), /ComponentBwilder:.*connectedCallback failed/)
    assert.match(String(postMountErrors[0]?.[1]), /postMount sync failed/)
  })

  test('postMountFn cleanup is called on disconnect', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('postmount-cleanup'))
      .wShadowDOM('none')
      .wRender(stubRender)
      .wConnectedFn(function () {
        events.push('mount')
        return () => events.push('cleanup')
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.deepEqual(events, ['mount'])

    c.disconnectedCallback()
    assert.deepEqual(events, ['mount', 'cleanup'])
  })

  test('isConnected resets on disconnect so reconnect reruns lifecycle', async () => {
    let mountCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('postmount-reset'))
      .wShadowDOM('none')
      .wRender(stubRender)
      .wConnectedFn(function () {
        mountCount++
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.equal(mountCount, 1)

    c.disconnectedCallback()
    await c.connectedCallback()
    assert.equal(mountCount, 2)
  })

  test('postMountFn cleanup runs before postMountFn re-runs on reconnect', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('postmount-cleanup-reconnect'))
      .wShadowDOM('none')
      .wRender(stubRender)
      .wConnectedFn(function () {
        events.push('mount')
        return () => events.push('cleanup')
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    c.disconnectedCallback()
    await c.connectedCallback()
    assert.deepEqual(events, ['mount', 'cleanup', 'mount'])
  })

  test('disconnect logs cleanup failures and continues', async () => {
    const events: string[] = []
    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => errors.push(args)

    try {
      const MyComponentClass = new ComponentBwilder()
        .wTagName(nextTag('cleanup-error'))
        .wShadowDOM('none')
        .wRender(stubRender)
        .wConnectedFn(function () {
          return () => {
            events.push('bad-cleanup')
            throw new Error('cleanup failed')
          }
        })
        .bwild()

      const c = new MyComponentClass()
      await c.connectedCallback()
      c.disconnectedCallback()
      assert.deepEqual(events, ['bad-cleanup'])
      assert.match(String(errors[0]?.[0]), /ComponentBwilder:.*disconnectedCallback cleanup failed/)
      assert.match(String(errors[0]?.[1]), /cleanup failed/)
    } finally {
      console.error = originalError
    }
  })

  test('async postMountFn returning a cleanup function calls cleanup on disconnect', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('async-postmount-cleanup'))
      .wShadowDOM('none')
      .wRender(stubRender)
      .wConnectedFn(async function () {
        await Promise.resolve()
        events.push('mount')
        return () => events.push('cleanup')
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.deepEqual(events, ['mount'])

    c.disconnectedCallback()
    assert.deepEqual(events, ['mount', 'cleanup'])
  })


  test('injects CSS style only once across re-renders', async () => {
    const css = '.single-style { color: green; }'

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('single-style'))
      .wShadowDOM('none')
      .wAttrRender('data-v')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="single-style">Text</div>'
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    c.setAttribute('data-v', 'a')
    await Promise.resolve() // yield to microtasks: flush the render triggered by setAttribute
    await c.render()

    assert.equal(c.querySelectorAll('style').length, 1)
    assert.equal(c.querySelector('style')!.textContent, css)
  })

  test('injects CSS style only once in open shadow root across re-renders', async () => {
    const css = '.single-style-shadow { color: purple; }'

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('single-style-shadow'))
      .wShadowDOM('open')
      .wAttrRender('data-v')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="single-style-shadow">Shadow Text</div>'
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    c.setAttribute('data-v', 'a')
    c.render()

    assert.equal(c.shadowRoot!.querySelectorAll('style').length, 0)
    const adoptedSheets = (c.shadowRoot! as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets
    assert.equal(adoptedSheets.length, 1)
  })

  test('falls back to inline CSS and logs warning when adopted mode is unavailable', async () => {
    resetTest()
    const css = '.fallback-style { color: teal; }'
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (message?: unknown) => {
      warnings.push(String(message ?? ''))
    }

    try {
      const MyComponentClass = new ComponentBwilder()
        .wTagName(nextTag('css-fallback-inline'))
        .wShadowDOM('none')
        .wAttrRender('data-v')
        .wCSS(css)
        .wRender(function () {
          this.root.innerHTML = '<div class="fallback-style">Fallback</div>'
        })
        .bwild()

      const c = new MyComponentClass()
      await c.connectedCallback()
      c.setAttribute('data-v', 'next')
      await Promise.resolve() // yield to microtasks: flush the render triggered by setAttribute
      await c.render()

      assert.equal(c.querySelectorAll('style').length, 1)
      assert.equal(c.querySelector('style')!.textContent, css)
      assert.equal(warnings.length, 1)
      assert.match(warnings[0], /Falling back to "inline"/)
    } finally {
      console.warn = originalWarn
    }
  })

  test('supports explicit inline CSS mode in open shadow root', async () => {
    const css = '.inline-style { color: navy; }'

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('css-inline-mode'))
      .wShadowDOM('open')
      .wCSS(css, 'inline')
      .wRender(function () {
        this.root.innerHTML = '<div class="inline-style">Inline</div>'
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(c.shadowRoot!.querySelectorAll('style').length, 1)
    assert.equal(c.shadowRoot!.querySelector('style')!.textContent, css)
  })

  test('adopted mode reuses stylesheet instance for same CSS across components', async () => {
    const css = '.shared-adopted { color: magenta; }'

    const ComponentA = new ComponentBwilder()
      .wTagName(nextTag('adopted-reuse-a'))
      .wShadowDOM('open')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="shared-adopted">A</div>'
      })
      .bwild()

    const ComponentB = new ComponentBwilder()
      .wTagName(nextTag('adopted-reuse-b'))
      .wShadowDOM('open')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="shared-adopted">B</div>'
      })
      .bwild()

    const a = new ComponentA()
    const b = new ComponentB()
    await a.connectedCallback()
    await b.connectedCallback()

    const aSheets = (a.shadowRoot! as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets
    const bSheets = (b.shadowRoot! as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets

    assert.equal(aSheets.length, 1)
    assert.equal(bSheets.length, 1)
    assert.equal(aSheets[0], bSheets[0])
  })

  test('adopted mode does not log fallback warning when supported', () => {
    const css = '.adopted-no-warning { color: olive; }'
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (message?: unknown) => {
      warnings.push(String(message ?? ''))
    }

    try {
      const MyComponentClass = new ComponentBwilder()
        .wTagName(nextTag('adopted-no-warning'))
        .wShadowDOM('open')
        .wAttrRender('data-v')
        .wCSS(css)
        .wRender(function () {
          this.root.innerHTML = '<div class="adopted-no-warning">Text</div>'
        })
        .bwild()

      const c = new MyComponentClass()
      c.connectedCallback()
      c.setAttribute('data-v', 'next')

      assert.equal(warnings.length, 0)
    } finally {
      console.warn = originalWarn
    }
  })

  test('does not inject builder CSS when render output already includes style tag', () => {
    const builderCss = '.builder-style { color: orange; }'
    const renderCss = '.render-style { color: black; }'

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('preexisting-style'))
      .wShadowDOM('none')
      .wCSS(builderCss)
      .wRender(function () {
        this.root.innerHTML = `<style>${renderCss}</style><div class="render-style">Styled</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(c.querySelectorAll('style').length, 1)
    assert.equal(c.querySelector('style')!.textContent, renderCss)
  })

  test('closed shadowDOM keeps shadowRoot inaccessible', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('closed-shadow'))
      .wShadowDOM('closed')
      .wRender(function () {
        this.root.innerHTML = '<div>Inside closed root</div>'
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(c.shadowRoot, null)
    assert.equal(c.innerHTML, '')
  })

  test('duplicate custom element tag registration throws', () => {
    const tag = nextTag('duplicate-tag')

    new ComponentBwilder()
      .wTagName(tag)
      .wRender(stubRender)
      .bwild()

    assert.throws(() => {
      new ComponentBwilder()
        .wTagName(tag)
        .wRender(stubRender)
        .bwild()
    }, /already.*used|already.*defined|already.*registered/i)
  })

  test('registers class in customElements registry when tagName is provided', () => {
    const tag = nextTag('registry-tag')

    const MyComponentClass = new ComponentBwilder()
      .wTagName(tag)
      .wRender(stubRender)
      .bwild()

    assert.equal(customElements.get(tag), MyComponentClass)
  })

  test('invalid custom element tag name throws at build', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wTagName('invalidtag' as unknown as TagName)
        .wRender(stubRender)
        .bwild()
    }, /valid custom element name|NotSupportedError|hyphen/i)
  })

  test('duplicate sub-element declarations throw', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wSubElement('title')
        .wSubElement('title!')
    }, /Sub-element "title" is already defined\./)
  })

  test('wSubElement can be chained without runtime side effects', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('with-element-chain'))
      .wSubElement('title')
      .wSubElement('content')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<h1 id="title">T</h1><div id="content">C</div>'
        return {
          title: this.root.querySelector('#title') as HTMLElement | null,
          content: this.root.querySelector('#content') as HTMLElement | null
        }
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(c.querySelector('#title')!.textContent, 'T')
    assert.equal(c.querySelector('#content')!.textContent, 'C')
  })

  test('subElements are resolved from selector map returned by render', async () => {
    let postRenderTitle = ''

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('subelements-selector-map'))
      .wSubElement('title')
      .wSubElement('content')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<h1 id="title">My Title</h1><div id="content">My Content</div>'
        return {
          title: '#title',
          content: '#content'
        }
      })
      .wAfterUpdateFn(function ({subElements}) {
        postRenderTitle = subElements.title?.textContent ?? ''
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(postRenderTitle, 'My Title')
    assert.equal(c.subElements.title?.textContent, 'My Title')
    assert.equal(c.subElements.content?.textContent, 'My Content')
  })

  test('subElements accept direct element map returned by render', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('subelements-element-map'))
      .wSubElement('title')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<h1 id="title">Direct Element</h1>'
        return {
          title: this.root.querySelector('#title') as HTMLElement | null
        }
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(c.subElements.title?.textContent, 'Direct Element')
  })

  test('required subElements resolve successfully from selectors', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('required-subelements-success'))
      .wSubElement('title!')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<h1 id="title">Required Title</h1>'
        return {title: '#title'}
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(c.subElements.title!.textContent, 'Required Title')
  })

  test('required subElements log when a selector is missing', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('required-subelements-missing'))
      .wSubElement('title!')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>Missing title</div>'
        return {title: '#title'}
      })
      .bwild()

    const c = new MyComponentClass()
    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => errors.push(args)
    try {
      await c.connectedCallback()
    } finally {
      console.error = originalError
    }
    assert.match(String(errors[0]?.[0]), /ComponentBwilder:.*connectedCallback failed/)
    assert.match(String(errors[0]?.[1]), /Required sub-element "title".*selector "#title"/)
  })

  test('required subElements log when a direct element is null or omitted', async () => {
    const NullComponentClass = new ComponentBwilder()
      .wTagName(nextTag('required-subelements-null'))
      .wSubElement('title!')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>Null title</div>'
        return {title: null}
      })
      .bwild()

    const OmittedComponentClass = new ComponentBwilder()
      .wTagName(nextTag('required-subelements-omitted'))
      .wSubElement('title!')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>Omitted title</div>'
      })
      .bwild()

    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => errors.push(args)
    try {
      await new NullComponentClass().connectedCallback()
      await new OmittedComponentClass().connectedCallback()
    } finally {
      console.error = originalError
    }
    assert.match(String(errors[0]?.[0]), /ComponentBwilder:.*connectedCallback failed/)
    assert.match(String(errors[0]?.[1]), /Required sub-element "title".*null/)
    assert.match(String(errors[1]?.[0]), /ComponentBwilder:.*connectedCallback failed/)
    assert.match(String(errors[1]?.[1]), /Required sub-element "title".*no value was returned/)
  })

  test('subElements are provided to methods following their declaration', () => {
    let postMountContent = ''

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('subelements-post-mount'))
      .wSubElement('content')
      .wShadowDOM('open')
      .wRender(function () {
        this.root.innerHTML = '<div id="content">Mounted Content</div>'
        return {
          content: '#content'
        }
      })
      .wConnectedFn(function ({subElements}) {
        assert.equal(subElements.content?.textContent, 'Mounted Content')
        assert.equal(this.subElements.content?.textContent, 'Mounted Content')
      })
      .wAttrBind('data-update', {
        handler() {
          assert.equal(this.subElements.content?.textContent, 'Mounted Content')
        }
      })
      .wSubElement<'more', HTMLSlotElement>('more')
      .wAttrBind('data-more', {
        handler() {
          assert.equal(this.subElements.content?.textContent, 'Mounted Content')
          assert.equal(this.subElements.more, null)
        }
      })
      .bwild()
  })

  test('build works without tagName and returns a class', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(null)
      .wShadowDOM('none')
      .wRender(stubRender)
      .bwild()

    assert.equal(typeof MyComponentClass, 'function')
    // Without a tagName, the component is not registered, so it can be subclassed
    // but cannot be directly instantiated in a DOM environment
  })

  test('slotAddedHandler gets called for assigned elements', async () => {
    const events: string[] = []
    const assignedEl = document.createElement('div')
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('slot-aware'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot />'
      })
      .wSlotAddedHandler(function ({}, slottedEl) {
        events.push(`assigned:${slottedEl.tagName.toLowerCase()}`)
        return () => events.push(`cleanup:${slottedEl.tagName.toLowerCase()}`)
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    const slot = c.shadowRoot!.querySelector('slot') as HTMLSlotElement
    ;(slot as any).assignedElements = () => [assignedEl]
    slot.dispatchEvent(new (slot.ownerDocument.defaultView as any).Event('slotchange'))

    assert.deepEqual(events, ['assigned:div'])
    c.disconnectedCallback()
    assert.deepEqual(events, ['assigned:div', 'cleanup:div'])
  })

  test('slotchange handler failures are logged', async () => {
    let assigned: HTMLElement[] = []
    const errors: unknown[][] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => errors.push(args)
    try {
      const MyComponentClass = new ComponentBwilder()
        .wTagName(nextTag('slotchange-error'))
        .wShadowDOM('open')
        .wRender(function ({root}) {
          root.innerHTML = '<slot />'
          const slot = root.querySelector('slot') as HTMLSlotElement
          ;(slot as any).assignedElements = () => assigned
        })
        .wSlotAddedHandler(() => { throw new Error('slotchange failed') })
        .bwild()
      const c = new MyComponentClass()
      await c.connectedCallback()
      const slot = c.shadowRoot!.querySelector('slot') as HTMLSlotElement
      const element = document.createElement('div')
      assigned = [element]
      ;(slot as any).assignedElements = () => assigned
      slot.dispatchEvent(new (slot.ownerDocument.defaultView as any).Event('slotchange'))
      await new Promise((resolve) => setImmediate(resolve))
      assert.ok(errors.some(([message]) => /slotchange failed/i.test(String(message))))
      assert.ok(errors.some(([message]) => /ComponentBwilder:/i.test(String(message))))
      assert.ok(errors.some(([, error]) => /slotAddedHandler failed/.test(String(error))))
    } finally {
      console.error = originalError
    }
  })

  test('slotAddedHandler failures reject render after all handlers finish', async () => {
    const events: string[] = []
    let assigned: HTMLElement[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('slot-handler-rejects'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        if (!root.querySelector('slot'))
          root.innerHTML = '<slot />'
        const slot = root.querySelector('slot') as HTMLSlotElement
        const assignedForThisRender = assigned
        ;(slot as any).assignedElements = () => assignedForThisRender
      })
      .wSlotAddedHandler(async function (_, slottedEl) {
        const id = slottedEl.getAttribute('data-id') ?? 'unknown'
        events.push(`start:${id}`)
        if (id === 'bad') {
          throw new Error('boom')
        }
        return () => events.push(`cleanup:${id}`)
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    const good = document.createElement('div')
    good.setAttribute('data-id', 'good')
    const bad = document.createElement('div')
    bad.setAttribute('data-id', 'bad')
    assigned = [good, bad]

    await assert.rejects(
      () => c.render(),
      /slotAddedHandler failed for 1 assigned element\(s\)/
    )
    assert.deepEqual(events, ['start:good', 'start:bad'])
  })

  test('slotAddedHandler async cleanup failures continue remaining cleanup', async () => {
    const events: string[] = []
    let assigned: HTMLElement[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('slot-handler-cleanup-errors'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot />'
        const slot = root.querySelector('slot') as HTMLSlotElement
        const assignedForThisRender = assigned
        ;(slot as any).assignedElements = () => assignedForThisRender
      })
      .wSlotAddedHandler(function (_, slottedEl) {
        const id = slottedEl.getAttribute('data-id') ?? 'unknown'
        events.push(`add:${id}`)
        if (id === 'bad') {
          return async () => {
            events.push(`cleanup:${id}`)
            throw new Error('cleanup boom')
          }
        }
        return async () => {
          events.push(`cleanup:${id}`)
        }
      })
      .bwild()

    const c = new MyComponentClass()
    const good = document.createElement('div')
    good.setAttribute('data-id', 'good')
    const bad = document.createElement('div')
    bad.setAttribute('data-id', 'bad')
    assigned = [good, bad]

    await c.connectedCallback()
    assigned = []
    await c.render()
    c.disconnectedCallback()
    await Promise.resolve()

    assert.deepEqual(events, ['add:good', 'add:bad', 'cleanup:good', 'cleanup:bad'])
  })

  test('slotAddedHandler tracks assigned elements when rerender replaces the slot', async () => {
    const events: string[] = []
    let assigned: HTMLElement[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('slot-handler-rerender'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot />'
        const slot = root.querySelector('slot') as HTMLSlotElement
        const assignedForThisRender = assigned
        ;(slot as any).assignedElements = () => assignedForThisRender
      })
      .wSlotAddedHandler(function (_, slottedEl) {
        const id = slottedEl.getAttribute('data-id') ?? 'unknown'
        events.push(`add:${id}`)
        return () => events.push(`cleanup:${id}`)
      })
      .bwild()

    const first = document.createElement('div')
    first.setAttribute('data-id', 'first')
    const second = document.createElement('div')
    second.setAttribute('data-id', 'second')
    assigned = [first]

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.deepEqual(events, ['add:first'])

    assigned = [second]
    await c.render()

    assert.deepEqual(events, ['add:first', 'cleanup:first', 'add:second'])
  })

  test('slotAddedHandler is a no-op when render produces no slots', () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('no-slot-handler'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<div>No slots here</div>'
      })
      .wSlotAddedHandler(function () {
        events.push('called')
        return () => events.push('cleanup')
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()
    assert.deepEqual(events, [])

    c.render()
    assert.deepEqual(events, [])
  })

  test('slotAddedHandler tracks assigned elements across slot changes', async () => {
    const events: string[] = []
    let assigned: HTMLElement[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('slot-tracker'))
      .wRender(function ({root}) {
        root.innerHTML = '<slot data-slot="s"></slot>'
      })
      .wSlotAddedHandler(function (_, el) {
        const id = el.getAttribute('data-id') ?? 'none'
        events.push(`add:${id}`)
        return () => events.push(`remove:${id}`)
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    const slot = c.shadowRoot!.querySelector('slot') as HTMLSlotElement

    const elA = document.createElement('div');
    elA.setAttribute('data-id', 'a')
    const elB = document.createElement('div');
    elB.setAttribute('data-id', 'b')
    assigned = [elA, elB]
    ;(slot as any).assignedElements = () => assigned
    slot.dispatchEvent(new (slot.ownerDocument.defaultView as any).Event('slotchange'))
    assert.deepEqual(events, ['add:a', 'add:b'])

    assigned = [elB]
    slot.dispatchEvent(new (slot.ownerDocument.defaultView as any).Event('slotchange'))
    assert.deepEqual(events, ['add:a', 'add:b', 'remove:a'])
  })

  test('render function is bound to this context', () => {
    let foundThis = undefined
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('render-this-context'))
      .wShadowDOM('none')
      .wRender(function () {
        foundThis = this
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(foundThis, c)
  })

  test('rerender function is bound to this context in wConnectedFn functions', () => {
    let foundThis = undefined
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('render-this-context'))
      .wShadowDOM('none')
      .wRender(function () {
        foundThis = this
      })
      .wConnectedFn(function () {
        foundThis = null
        this.requestUpdate()
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(foundThis, c)
  })

  test('wShadowDOM(none) sets root to the element itself', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('shadow-none-root'))
      .wShadowDOM('none')
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    assert.equal(c.root, c)
  })

  test('wTagName(null) does not register the class in customElements', () => {
    const tag = nextTag('null-tag-check')

    new ComponentBwilder()
      .wTagName(null)
      .wRender(stubRender)
      .bwild()

    assert.equal(customElements.get(tag), undefined)
  })

  test('rerender() before connectedCallback() renders but does not run postMountFn', () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('rerender-pre-connect'))
      .wShadowDOM('none')
      .wRender(function () {
        events.push('render')
        this.root.innerHTML = '<div>content</div>'
      })
      .wConnectedFn(function () {
        events.push('postMount')
      })
      .bwild()

    const c = new MyComponentClass()
    c.requestUpdate()

    assert.deepEqual(events, ['render'])
    assert.equal(c.querySelector('div')!.textContent, 'content')
  })

  test('observed attr callback receives correct non-null oldValue on second setAttribute', () => {
    const transitions: Array<{ oldValue: unknown, newValue: unknown }> = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('old-value-second'))
      .wAttrBind('data-val', {
        handler({oldValue, newValue}) {
          transitions.push({oldValue, newValue})
        }
      })
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-val', 'a')
    c.setAttribute('data-val', 'b')

    assert.equal(transitions.length, 2)
    assert.equal(transitions[1].oldValue, 'a')
    assert.equal(transitions[1].newValue, 'b')
  })

  test('wSubElement declared but render returns void leaves subElements entries as null', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('subelements-void'))
      .wSubElement('myEl')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div id="myEl">content</div>'
        // intentionally returns nothing (void)
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(c.subElements.myEl, null)
  })

  test('wSlotAddedHandler is called for elements assigned across multiple slots', async () => {
    const events: string[] = []

    const elA = document.createElement('div')
    elA.setAttribute('data-id', 'a')
    const elB = document.createElement('span')
    elB.setAttribute('data-id', 'b')

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('multi-slot-handler'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot name="first"></slot><slot name="second"></slot>'
      })
      .wSlotAddedHandler(function ({}, slottedEl) {
        events.push(`assigned:${slottedEl.tagName.toLowerCase()}:${slottedEl.getAttribute('data-id')}`)
        return () => {}
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    const [slot1, slot2] = Array.from(c.shadowRoot!.querySelectorAll('slot')) as HTMLSlotElement[]
    ;(slot1 as any).assignedElements = () => [elA]
    ;(slot2 as any).assignedElements = () => [elB]

    slot1.dispatchEvent(new (slot1.ownerDocument.defaultView as any).Event('slotchange'))

    assert.deepEqual(events, ['assigned:div:a', 'assigned:span:b'])
  })

  test('wSlotAddedHandler handler returning void does not throw on disconnect', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('slot-void-cleanup'))
      .wRender(function ({root}) {
        root.innerHTML = '<slot></slot>'
      })
      .wSlotAddedHandler(function () {
        return undefined as any
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    const slot = c.shadowRoot!.querySelector('slot') as HTMLSlotElement
    const assignedEl = document.createElement('div')
    ;(slot as any).assignedElements = () => [assignedEl]
    slot.dispatchEvent(new (slot.ownerDocument.defaultView as any).Event('slotchange'))

    assert.doesNotThrow(() => c.disconnectedCallback())
  })

  test('slotAddedHandler cleanup fires on disconnect for elements present at mount', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('pre-assigned-cleanup'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot></slot>'
      })
      .wConnectedFn(function () {
        const slot = this.shadowRoot!.querySelector('slot') as HTMLSlotElement
        const el = document.createElement('div')
        el.setAttribute('data-id', 'pre')
        ;(slot as any).assignedElements = () => [el]
      })
      .wSlotAddedHandler(function ({}, slottedEl) {
        events.push(`add:${slottedEl.getAttribute('data-id')}`)
        return () => events.push(`cleanup:${slottedEl.getAttribute('data-id')}`)
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.deepEqual(events, ['add:pre'])

    c.disconnectedCallback()
    assert.deepEqual(events, ['add:pre', 'cleanup:pre'])
  })

  test('slotAddedHandler does not fire during rerender() before connectedCallback', () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('rerender-pre-connect-slot'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot></slot>'
      })
      .wAfterUpdateFn(function ({root}) {
        const slot = root.querySelector('slot') as HTMLSlotElement
        const el = document.createElement('div')
        el.setAttribute('data-id', 'x')
        ;(slot as any).assignedElements = () => [el]
      })
      .wSlotAddedHandler(function ({}, slottedEl) {
        events.push(`handler:${slottedEl.getAttribute('data-id')}`)
        return () => {}
      })
      .bwild()

    const c = new MyComponentClass()
    c.requestUpdate()

    assert.deepEqual(events, [])
  })

  test('slotAddedHandler fires for elements present at mount when no postMountFn', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('pre-assigned-no-postmount'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot></slot>'
      })
      .wAfterUpdateFn(function ({root}) {
        // Set up the mock after render completes, before slotAddedHandler fires
        const slot = root.querySelector('slot') as HTMLSlotElement
        const el = document.createElement('div')
        el.setAttribute('data-id', 'pre')
        ;(slot as any).assignedElements = () => [el]
      })
      .wSlotAddedHandler(function ({}, slottedEl) {
        events.push(`handler:${slottedEl.getAttribute('data-id')}`)
        return () => {}
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.deepEqual(events, ['handler:pre'])
  })

  test('slotAddedHandler fires after postMountFn for elements present at mount', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('pre-assigned-ordering'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot></slot>'
      })
      .wConnectedFn(function () {
        // Mock assignedElements here — before slotAddedHandler should fire
        const slot = this.shadowRoot!.querySelector('slot') as HTMLSlotElement
        const el = document.createElement('div')
        el.setAttribute('data-id', 'pre')
        ;(slot as any).assignedElements = () => [el]
        events.push('postMount')
      })
      .wSlotAddedHandler(function ({}, slottedEl) {
        events.push(`handler:${slottedEl.getAttribute('data-id')}`)
        return () => {}
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.deepEqual(events, ['postMount', 'handler:pre'])
  })

  test('slotAddedHandler fires after async postMountFn resolves', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('pre-assigned-async-postmount'))
      .wShadowDOM('open')
      .wRender(function ({root}) {
        root.innerHTML = '<slot></slot>'
      })
      .wConnectedFn(async function () {
        events.push('postMount-start')
        await Promise.resolve()
        const slot = this.shadowRoot!.querySelector('slot') as HTMLSlotElement
        const el = document.createElement('div')
        el.setAttribute('data-id', 'pre')
        ;(slot as any).assignedElements = () => [el]
        events.push('postMount-end')
      })
      .wSlotAddedHandler(function ({}, slottedEl) {
        events.push(`handler:${slottedEl.getAttribute('data-id')}`)
        return () => {}
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.deepEqual(events, ['postMount-start', 'postMount-end', 'handler:pre'])
  })

})

describe('wState', () => {

  test('throws when the same state name is defined more than once', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wState('count', 0)
        .wState('count', 1)
    }, /State "count" is already defined\./)
  })

  test('initial value is accessible in render via this.state', () => {
    let stateVal: unknown = undefined

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wstate-basic'))
      .wShadowDOM('none')
      .wState('count', 0)
      .wRender(function () {
        stateVal = this.state.count
        this.root.innerHTML = `<div>${this.state.count}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(stateVal, 0)
    assert.equal(c.querySelector('div')!.textContent, '0')
  })

  test('factory function is called once per instance, not shared', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wstate-factory'))
      .wShadowDOM('none')
      .wState('items', () => [] as string[])
      .wRender(function () {
        this.root.innerHTML = `<div>${this.state.items.length}</div>`
      })
      .bwild()

    const a = new MyComponentClass()
    const b = new MyComponentClass()
    a.connectedCallback()
    b.connectedCallback()

    // mutate a's state
    a.state.items.push('x')

    assert.deepEqual(a.state.items, ['x'])
    assert.deepEqual(b.state.items, [], 'b should have its own independent array')
  })

  test('assigning to this.state does NOT trigger re-render; requestUpdate() does', async () => {
    let renderCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wstate-set'))
      .wShadowDOM('none')
      .wState('count', 0)
      .wRender(function () {
        renderCount += 1
        this.root.innerHTML = `<div>${this.state.count}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.equal(renderCount, 1)
    assert.equal(c.querySelector('div')!.textContent, '0')

    c.state.count = 42
    assert.equal(renderCount, 1, 'no re-render on assignment alone')

    await c.requestUpdate()
    assert.equal(renderCount, 2)
    assert.equal(c.querySelector('div')!.textContent, '42')
  })

  test('two instances have independent state', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wstate-independent'))
      .wShadowDOM('none')
      .wState('count', 0)
      .wRender(function () {
        this.root.innerHTML = `<div>${this.state.count}</div>`
      })
      .bwild()

    const a = new MyComponentClass()
    const b = new MyComponentClass()
    await a.connectedCallback()
    await b.connectedCallback()

    a.state.count = 10
    b.state.count = 99

    assert.equal(a.state.count, 10)
    assert.equal(b.state.count, 99)

    await a.requestUpdate()
    await b.requestUpdate()

    assert.equal(a.querySelector('div')!.textContent, '10')
    assert.equal(b.querySelector('div')!.textContent, '99')
  })

  test('multiple wState values are all accessible on this.state', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wstate-multiple'))
      .wShadowDOM('none')
      .wState('name', 'Alice')
      .wState('age', 30)
      .wRender(function () {
        this.root.innerHTML = `<div>${this.state.name}:${this.state.age}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(c.querySelector('div')!.textContent, 'Alice:30')

    c.state.name = 'Bob'
    c.state.age = 25
    await c.requestUpdate()
    assert.equal(c.querySelector('div')!.textContent, 'Bob:25')
  })

  test('state is accessible in wConnectedFn and wAfterUpdateFn via context', async () => {
    let postMountVal: unknown
    let postRenderVal: unknown

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wstate-hooks'))
      .wShadowDOM('none')
      .wState('value', 'hello')
      .wRender(function () {
        this.root.innerHTML = '<div>ready</div>'
      })
      .wConnectedFn(function (context) {
        postMountVal = context.state.value
      })
      .wAfterUpdateFn(function (context) {
        postRenderVal = context.state.value
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(postMountVal, 'hello')
    assert.equal(postRenderVal, 'hello')
  })

  test('bang (!) suffix marks elements as required, stripping bang from actual name', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('bang-required'))
      .wSubElement('email!')
      .wSubElement('submit!')
      .wSubElement('status')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = `
          <input id="email" />
          <button id="submit">Submit</button>
          <div id="status"></div>
        `
        return {
          email: '#email',
          submit: '#submit',
          status: '#status'
        }
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    // All should be populated
    assert.ok(c.subElements.email)
    assert.ok(c.subElements.submit)
    assert.ok(c.subElements.status)
  })

  test('bang suffix works with attributes', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('bang-attrs'))
      .wAttr('optional-attr')
      .wAttr('required-attr!')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>ready</div>'
      })
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('optional-attr', 'opt-value')
    c.setAttribute('required-attr', 'req-value')
    await c.connectedCallback()

    // Both should be accessible via property name without bang
    assert.equal(c['optional-attr'], 'opt-value')
    assert.equal(c['required-attr'], 'req-value')
  })

  test('required attributes are enforced during connectedCallback', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('required-attr-missing'))
      .wAttr('required-attr!')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>ready</div>'
      })
      .bwild()

    const c = new MyComponentClass()
    const errors: unknown[][] = []
    const originalError = console.error
    try {
      console.error = (...args: unknown[]) => errors.push(args)
      await c.connectedCallback()
    } finally {
      console.error = originalError
    }

    assert.match(String(errors[0]?.[0]), /ComponentBwilder:.*connectedCallback failed/)
    assert.match(String(errors[0]?.[1]), /Required attribute "required-attr" is missing/)
  })

  test('bang suffix is stripped from subElement names at declaration time', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('bang-strip'))
      .wSubElement('email!')
      .wSubElement('status')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = `
          <input id="email" />
          <div id="status"></div>
        `
        return {
          email: '#email',
          status: '#status'
        }
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    // Verify keys in subElements are without bangs
    const keys = Object.keys(c.subElements)
    assert.ok(keys.includes('email'), 'Should have "email" key without bang')
    assert.ok(keys.includes('status'), 'Should have "status" key')
    assert.ok(!keys.includes('email!'), 'Should NOT have "email!" key with bang')
  })

})

describe('attribute declaration APIs', () => {

  test('wAttr returns fallback when attribute is absent', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-ifmissing'))
      .wShadowDOM('none')
      .wAttr('data-color', {ifMissing: 'blue'})
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.equal(c['data-color'], 'blue', 'should return ifMissing when attr absent')

    c.setAttribute('data-color', 'red')
    assert.equal(c['data-color'], 'red', 'should return actual value when attr present')
  })

  test('wAttr returns fallback after attribute is removed', async () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-ifmissing-null'))
      .wShadowDOM('none')
      .wAttr('data-color', {ifMissing: 'blue'})
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-color', 'red')
    await c.connectedCallback()
    c.removeAttribute('data-color')
    assert.equal(c['data-color'], 'blue', 'should return ifMissing after removal')
  })

  test('wAttrRender observes attribute and auto-rerenders', async () => {
    let renderCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-observe-rerender'))
      .wShadowDOM('none')
      .wAttrRender('data-v')
      .wRender(function () {
        renderCount++
        this.root.innerHTML = `<div>${this['data-v']}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.equal(renderCount, 1)

    c.setAttribute('data-v', 'hello')
    assert.equal(renderCount, 2, 'should re-render on attribute change')
  })

  test('wAttrBind observes attribute and calls fn', () => {
    let received: unknown = null

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-observe-fn'))
      .wShadowDOM('none')
      .wAttrBind('data-v', {
        handler({newValue}) {
          received = newValue
        }
      })
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-v', 'world')
    assert.equal(received, 'world')
  })

  test('wAttrBind callback receives name, newValue, oldValue and this context', () => {
    let callbackArgs: any = null
    let callbackThis: unknown = null

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-observe-fn-args'))
      .wShadowDOM('none')
      .wAttrBind('data-v', {
        handler(this: HTMLElement, args) {
          callbackThis = this
          callbackArgs = args
        }
      })
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-v', '42')

    assert.equal(callbackThis, c)
    assert.equal(callbackArgs.name, 'data-v')
    assert.equal(callbackArgs.oldValue, null)
    assert.equal(callbackArgs.newValue, '42')
  })

  test('wAttrBind with initial runs after render with subElements available', async () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-bind-initial'))
      .wShadowDOM('none')
      .wSubElement('value!')
      .wAttrBind('data-v', {
        initial: true,
        handler({newValue, initial}) {
          events.push(`${initial ? 'initial' : 'change'}:${newValue}`)
          this.subElements.value.textContent = String(newValue ?? '')
        }
      })
      .wRender(function () {
        this.root.innerHTML = '<span id="value"></span>'
        return {value: '#value'}
      })
      .wConnectedFn(function () {
        events.push(`connected:${this.subElements.value.textContent}`)
      })
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-v', 'ready')
    await c.connectedCallback()

    assert.deepEqual(events, ['initial:ready', 'connected:ready'])
    assert.equal(c.subElements.value.textContent, 'ready')
  })

  test('wAttrBind does not auto-rerender', async () => {
    let renderCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-no-rerender'))
      .wShadowDOM('none')
      .wAttrBind('data-v', {handler() {}})
      .wRender(function () {
        renderCount++
        this.root.innerHTML = '<div></div>'
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()
    assert.equal(renderCount, 1)

    c.setAttribute('data-v', 'x')
    assert.equal(renderCount, 1, 'onChange fn prevents auto-rerender')
  })

  test('wAttrBind with fallback — observed with callback and fallback', async () => {
    let received: unknown = null

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-fn-ifmissing'))
      .wShadowDOM('none')
      .wAttrBind('data-v', {
        ifMissing: 'default',
        handler({newValue}) {
          received = newValue
        }
      })
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(c['data-v'], 'default', 'should return ifMissing when absent')
    c.setAttribute('data-v', 'actual')
    assert.equal(received, 'actual', 'callback fires on change')
    assert.equal(c['data-v'], 'actual', 'getter returns actual value')
  })

  test('wAttrRender with fallback — observed with rerender and fallback', async () => {
    let renderCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-rerender-ifmissing'))
      .wShadowDOM('none')
      .wAttrRender('data-v', {ifMissing: 'fallback'})
      .wRender(function () {
        renderCount++
        this.root.innerHTML = `<div>${this['data-v']}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(c['data-v'], 'fallback', 'should return ifMissing when absent')
    assert.equal(renderCount, 1)

    c.setAttribute('data-v', 'live')
    assert.equal(renderCount, 2, 'rerenders on change')
    assert.equal(c['data-v'], 'live')
  })

  test('attribute declaration with same attr name twice throws', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wAttrRender('data-id')
        .wAttrRender('data-id')
    }, /Attr "data-id" is already defined\./)
  })

  test('attribute declaration attr appears in observedAttributes, unobserved attr does not', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('wattr-observed-list'))
      .wShadowDOM('none')
      .wAttrRender('data-x')
      .wAttrBind('data-y', {handler() {}})
      .wAttr('data-z')
      .wRender(stubRender)
      .bwild()

    const observed = (MyComponentClass as any).observedAttributes
    assert.ok(observed.includes('data-x'), 'data-x should be observed')
    assert.ok(observed.includes('data-y'), 'data-y should be observed')
    assert.ok(!observed.includes('data-z'), 'data-z should NOT be observed')
  })

})
