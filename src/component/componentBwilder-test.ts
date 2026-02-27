import {
  ComponentBwilder
} from './componentBwilder.ts'
import {assertValidTagName, type TagName} from './TagName.ts'
import {describe, test} from 'node:test'
import {strict as assert} from 'node:assert'
import {type RenderContext} from './render.ts'

let tagCounter = 0

function nextTag(prefix: string): TagName {
  tagCounter += 1
  const tagName = `${prefix}-${Date.now().toString(36)}-${tagCounter.toString(36)}`
  assertValidTagName(tagName)
  return tagName
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


describe('ComponentBwilder observed attributes', () => {
  test('basic definition', () => {
    const MyBuilder =
      new ComponentBwilder()
        .wTagName('observed-attrs-component' as TagName)
        .wObservedAttr('data-id', ({newValue, oldValue}) => {
          console.log(`data-id changed from ${oldValue} to ${newValue}`)
        })
        .wObservedAttr('role')
        .wRender(stubRender)

    const MyComponent = MyBuilder.bwild()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) throw new Error('Component is not an instance of HTMLElement')

    c.setAttribute('data-id', '123')
    c.setAttribute('role', 'admin')
  })

  test('same attribute defined twice', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wObservedAttr('data-id', ({newValue, oldValue}) => {
          console.log(`data-id changed from ${oldValue} to ${newValue}`)
        })
        .wObservedAttr('data-id')
    }, /Attr "data-id" is already observed/)

  })

  test('callback', () => {

    let dataParms = null as null | { newValue: unknown, oldValue: unknown }

    const MyComponentClass = new ComponentBwilder()
      .wTagName('observed-attrs-callback-component' as TagName)
      .wObservedAttr('data-id', function ({newValue, oldValue}) {
        dataParms = {newValue, oldValue}
      })
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()

    c.setAttribute('data-id', '123')

    assert.equal(dataParms!.oldValue, null)
    assert.equal(dataParms!.newValue, '123')
  })

  test('callback receives attr name and component as context', () => {

    let callbackThis: unknown = null
    let callbackArgs: null | { name: unknown, oldValue: unknown, newValue: unknown } = null

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('observed-attrs-context'))
      .wObservedAttr('data-id', function (this: HTMLElement, args) {
        callbackThis = this
        callbackArgs = args as { name: unknown, oldValue: unknown, newValue: unknown }
      })
      .wRender(stubRender)
      .bwild()

    const c = new MyComponentClass()
    c.setAttribute('data-id', '42')

    assert.equal(callbackThis, c)
    assert.equal(callbackArgs!.name, 'data-id')
    assert.equal(callbackArgs!.oldValue, null)
    assert.equal(callbackArgs!.newValue, '42')
  })

  test('callback receives null when observed attribute is removed', () => {
    const transitions: Array<{ oldValue: unknown, newValue: unknown }> = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('observed-attrs-remove'))
      .wObservedAttr('data-id', ({oldValue, newValue}) => {
        transitions.push({oldValue, newValue})
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
      .wTagName('rendered-component-with-render-fn' as TagName)
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
        .wTagName('rendered-component-without-render-fn' as TagName)
        .wShadowDOM('none')
        .bwild()
    }, /No render function provided to component/)
  })

  test('render function receives unobserved attribute value', () => {
    let unobservedValue: string | null = null;

    const MyComponentClass = new ComponentBwilder()
      .wTagName('rendered-component-with-unobs-attr' as TagName)
      .wShadowDOM('none')
      .wAttr('data-info')
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
      .wTagName('rendered-component-with-unobs-attr-null' as TagName)
      .wShadowDOM('none')
      .wAttr('data-info')
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
      .wTagName('rendered-component-with-unobs-attr-default' as TagName)
      .wShadowDOM('none')
      .wAttr('data-info', 'a default value')
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
      .wAttr('data-info', 'fallback-default')
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
      .wTagName('rendered-component-with-attr' as TagName)
      .wShadowDOM('none')
      .wObservedAttr('data-name')
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
      .wTagName('styled-component' as TagName)
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
      .wObservedAttr('data-first')
      .wObservedAttr('data-second')
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
      .wObservedAttr('data-id', () => {
        callbackCount += 1
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

  test('observed attr without callback auto-renders', () => {
    let renderCount = 0

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('obs-rerender'))
      .wShadowDOM('none')
      .wObservedAttr('data-name')
      .wRender(function () {
        renderCount += 1
        this.root.innerHTML = `<div>${this['data-name']}</div>`
      })
      .bwild()

    const c = new MyComponentClass()
    c.connectedCallback()
    assert.equal(renderCount, 1)

    c.setAttribute('data-name', 'Frank')
    assert.equal(renderCount, 2)
    assert.equal(c.querySelector('div')!.innerHTML, 'Frank')
  })

  test('render receives context as first argument', () => {
    let sameContextObject = false

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('render-context-arg'))
      .wShadowDOM('none')
      .wObservedAttr('data-name')
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
      .wObservedAttr('data-name')
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
      .wObservedAttr('data-v')
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
      .wObservedAttr('data-v')
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
      .wObservedAttr('data-v')
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

  test('connectedCallback rejects when async render rejects', async () => {
    let postMountCalled = false

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
    await assert.rejects(() => Promise.resolve(c.connectedCallback()), /render failed/)
    assert.equal(postMountCalled, false)
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

  test('connectedCallback rejects when postMountFn rejects', async () => {
    let renderCompleted = false

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
    await assert.rejects(() => Promise.resolve(c.connectedCallback()), /postMount failed/)
    assert.equal(renderCompleted, true)
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

  test('sync throws in render and post hooks propagate synchronously', async () => {
    const RenderThrowsClass = new ComponentBwilder()
      .wTagName(nextTag('sync-render-throw'))
      .wShadowDOM('none')
      .wRender(function () {
        throw new Error('render sync failed')
      })
      .bwild()

    const c1 = new RenderThrowsClass()
    assert.throws(() => {
      c1.connectedCallback()
    }, /render sync failed/)

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
    await assert.rejects(
      () => c3.connectedCallback(),
      /postMount sync failed/
    )
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
      .wObservedAttr('data-v')
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
      .wObservedAttr('data-v')
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
        .wObservedAttr('data-v')
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
        .wObservedAttr('data-v')
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

  test('wElement can be chained without runtime side effects', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('with-element-chain'))
      .wElement('title')
      .wElement('content')
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
      .wElement('title')
      .wElement('content')
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
      .wElement('title')
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

  test('subElements are provided to methods following their declaration', () => {
    let postMountContent = ''

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('subelements-post-mount'))
      .wElement('content')
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
      .wObservedAttr('data-update', function() {
        assert.equal(this.subElements.content?.textContent, 'Mounted Content')
      })
      .wElement<'more', HTMLSlotElement>('more')
      .wObservedAttr('data-more', function() {
        assert.equal(this.subElements.content?.textContent, 'Mounted Content')
        assert.equal(this.subElements.more, null)
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
      .wTagName('slot-aware')
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
      .wObservedAttr('data-val', ({oldValue, newValue}) => {
        transitions.push({oldValue, newValue})
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

  test('wElement declared but render returns void leaves subElements entries as null', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('subelements-void'))
      .wElement('myEl')
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

  test('assigning to this.state triggers re-render with new value', () => {
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
    c.connectedCallback()
    assert.equal(renderCount, 1)
    assert.equal(c.querySelector('div')!.textContent, '0')

    c.state.count = 42
    assert.equal(renderCount, 2)
    assert.equal(c.querySelector('div')!.textContent, '42')
  })

  test('two instances have independent state', () => {
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
    a.connectedCallback()
    b.connectedCallback()

    a.state.count = 10
    b.state.count = 99

    assert.equal(a.state.count, 10)
    assert.equal(b.state.count, 99)
    assert.equal(a.querySelector('div')!.textContent, '10')
    assert.equal(b.querySelector('div')!.textContent, '99')
  })

  test('multiple wState values are all accessible on this.state', () => {
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
    c.connectedCallback()

    assert.equal(c.querySelector('div')!.textContent, 'Alice:30')

    c.state.name = 'Bob'
    assert.equal(c.querySelector('div')!.textContent, 'Bob:30')

    c.state.age = 25
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

})
