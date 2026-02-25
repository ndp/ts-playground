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
new ComponentBwilder().wPostMountFn(() => {}).wPostMountFn(() => {})

// @ts-expect-error intentional duplicate post-render registration
new ComponentBwilder().wPostRenderFn(() => {}).wPostRenderFn(() => {})


const stubRender = function (this: RenderContext) {
  this.root.innerHTML = '<div>Stub</div>'
}

describe('ComponentBwilder basic tests', () => {
  test('successfully', () => {

    const MyBuilder =
      new ComponentBwilder()
        .wTagName('another-component' as TagName)
        .wCSS('.my-class { color: blue; }')
        .wShadowDOM('open')
        .wRender(function () {
          this.root.innerHTML = '<div>Stub</div>'
        })
    const MyComponent = MyBuilder.build()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) {
      throw new Error('Component is not an instance of HTMLElement')
    }
  })

  test('without css and shadowDOM', () => {
    const MyBuilder =
      new ComponentBwilder()
        .wTagName('simple-component' as TagName)
        .wRender(stubRender)
    const MyComponent = MyBuilder.build()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) throw new Error('Component is not an instance of HTMLElement')

  })

  test('with closed shadowDOM', () => {
    const MyBuilder = new ComponentBwilder()
      .wTagName('closed-component' as TagName)
      .wShadowDOM('closed')
      .wRender(stubRender)
    const MyComponent = MyBuilder.build()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) throw new Error('Component is not an instance of HTMLElement')
  })

  test('with no shadowDOM', () => {
    const MyBuilder =
      new ComponentBwilder()
        .wTagName('no-shadow-component' as TagName)
        .wShadowDOM('none')
        .wRender(stubRender)
    const MyComponent = MyBuilder.build()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) throw new Error('Component is not an instance of HTMLElement')

  })

  test('throws when tagName not explicitly set', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wShadowDOM('none')
        .wRender(stubRender)
        .build()
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

    const MyComponent = MyBuilder.build()

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
      .build()

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
      .build()

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
      .build()

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
      .build()

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
        .build()
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
      .build();

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
      .build();

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
      .build();
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
      .build()

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
      .build();

    const c = new MyComponentClass();
    c.setAttribute('data-name', 'world!');

    c.connectedCallback()

    const contentDiv = c.querySelector('div')
    assert.equal(contentDiv!.innerHTML, 'Hello, world!', 'Content div should have correct content')

    c.setAttribute('data-name', 'Frank');
    const contentDiv2 = c.querySelector('div')
    assert.equal(contentDiv2!.innerHTML, 'Hello, Frank', 'Content div should have updated content')
  })

  test('defaults to adopted CSS mode in open shadow DOM', () => {
    const css = `.test-class { color: red; }`;
    const MyComponentClass = new ComponentBwilder()
      .wTagName('styled-component' as TagName)
      .wShadowDOM('open')
      .wCSS(css)
      .wRender(function (this: RenderContext) {
        this.root.innerHTML = '<div class="test-class">Styled Text</div>';
      })
      .build();

    const c = new MyComponentClass();
    c.connectedCallback();

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
      .build()

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
      .build()

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
      .build()

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
      .build()

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
      .build()

    const c = new MyComponentClass()
    c.setAttribute('data-name', 'DestructureStyle')
    c.connectedCallback()

    assert.equal(c.querySelector('div')!.innerHTML, 'DestructureStyle')
  })

  test('wPostMountFn runs once after initial render', async () => {
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
      .wPostMountFn(function (c) {
        mountCount += 1
        events.push('postMount')
        assert.equal(this, c)
      })
      .build()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(mountCount, 1)
    assert.deepEqual(events, ['render', 'postMount'])

    c.setAttribute('data-v', 'next')

    assert.equal(mountCount, 1)
    assert.deepEqual(events, ['render', 'postMount', 'render'])
  })

  test('wPostMountFn receives context as first argument', async () => {
    let sameContextObject = false

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('post-mount-context-arg'))
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>ready</div>'
      })
      .wPostMountFn(function (context) {
        sameContextObject = this === context
      })
      .build()

    const c = new MyComponentClass()
    await c.connectedCallback()

    assert.equal(sameContextObject, true)
  })

  test('wPostRenderFn runs after every render', () => {
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
      .wPostRenderFn(function (c) {
        postRenderCount += 1
        assert.equal(this, c)
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()
    assert.equal(renderCount, 1)
    assert.equal(postRenderCount, 1)

    c.setAttribute('data-v', 'next')
    assert.equal(renderCount, 2)
    assert.equal(postRenderCount, 2)

    c.render()
    assert.equal(renderCount, 3)
    assert.equal(postRenderCount, 3)
  })

  test('wPostRenderFn supports destructured first-argument context', () => {
    let lastText = ''

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('post-render-context-destructure'))
      .wShadowDOM('none')
      .wObservedAttr('data-v')
      .wRender(function ({root, 'data-v': dataV}) {
        root.innerHTML = `<div>${dataV ?? 'init'}</div>`
      })
      .wPostRenderFn(function ({root}) {
        lastText = root!.querySelector('div')!.textContent ?? ''
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()
    assert.equal(lastText, 'init')

    c.setAttribute('data-v', 'next')
    assert.equal(lastText, 'next')
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
      .wPostRenderFn(async function ({root}) {
        events.push('postRender-start')
        await Promise.resolve()
        const txt = root.querySelector('div')!.textContent
        events.push(`postRender-end:${txt}`)
      })
      .wPostMountFn(async function ({root}) {
        events.push('postMount-start')
        await Promise.resolve()
        const txt = root.querySelector('div')!.textContent
        events.push(`postMount-end:${txt}`)
      })
      .build()

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
      .wPostRenderFn(async function () {
        await Promise.resolve()
        postRenderDone = true
      })
      .build()

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
      .wPostMountFn(function () {
        postMountCalled = true
      })
      .build()

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
      .wPostRenderFn(async function () {
        await Promise.resolve()
        throw new Error('postRender failed')
      })
      .build()

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
      .wPostMountFn(async function () {
        await Promise.resolve()
        throw new Error('postMount failed')
      })
      .build()

    const c = new MyComponentClass()
    await assert.rejects(() => Promise.resolve(c.connectedCallback()), /postMount failed/)
    assert.equal(renderCompleted, true)
  })

  test('sync throws in render and post hooks propagate synchronously', async () => {
    const RenderThrowsClass = new ComponentBwilder()
      .wTagName(nextTag('sync-render-throw'))
      .wShadowDOM('none')
      .wRender(function () {
        throw new Error('render sync failed')
      })
      .build()

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
      .wPostRenderFn(function () {
        throw new Error('postRender sync failed')
      })
      .build()

    const c2 = new PostRenderThrowsClass()
    assert.throws(() => {
      c2.render()
    }, /postRender sync failed/)

    const PostMountThrowsClass = new ComponentBwilder()
      .wTagName(nextTag('sync-post-mount-throw'))
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div>ok</div>'
      })
      .wPostMountFn(function () {
        throw new Error('postMount sync failed')
      })
      .build()

    const c3 = new PostMountThrowsClass()
    assert.throws(() => {
      c3.connectedCallback()
    }, /postMount sync failed/)
  })

  test('injects CSS style only once across re-renders', () => {
    const css = '.single-style { color: green; }'

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('single-style'))
      .wShadowDOM('none')
      .wObservedAttr('data-v')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="single-style">Text</div>'
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()
    c.setAttribute('data-v', 'a')
    c.render()

    assert.equal(c.querySelectorAll('style').length, 1)
    assert.equal(c.querySelector('style')!.textContent, css)
  })

  test('injects CSS style only once in open shadow root across re-renders', () => {
    const css = '.single-style-shadow { color: purple; }'

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('single-style-shadow'))
      .wShadowDOM('open')
      .wObservedAttr('data-v')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="single-style-shadow">Shadow Text</div>'
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()
    c.setAttribute('data-v', 'a')
    c.render()

    assert.equal(c.shadowRoot!.querySelectorAll('style').length, 0)
    const adoptedSheets = (c.shadowRoot! as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets
    assert.equal(adoptedSheets.length, 1)
  })

  test('falls back to inline CSS and logs warning when adopted mode is unavailable', () => {
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
        .build()

      const c = new MyComponentClass()
      c.connectedCallback()
      c.setAttribute('data-v', 'next')
      c.render()

      assert.equal(c.querySelectorAll('style').length, 1)
      assert.equal(c.querySelector('style')!.textContent, css)
      assert.equal(warnings.length, 1)
      assert.match(warnings[0], /Falling back to "inline"/)
    } finally {
      console.warn = originalWarn
    }
  })

  test('supports explicit inline CSS mode in open shadow root', () => {
    const css = '.inline-style { color: navy; }'

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('css-inline-mode'))
      .wShadowDOM('open')
      .wCSS(css, 'inline')
      .wRender(function () {
        this.root.innerHTML = '<div class="inline-style">Inline</div>'
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(c.shadowRoot!.querySelectorAll('style').length, 1)
    assert.equal(c.shadowRoot!.querySelector('style')!.textContent, css)
  })

  test('adopted mode reuses stylesheet instance for same CSS across components', () => {
    const css = '.shared-adopted { color: magenta; }'

    const ComponentA = new ComponentBwilder()
      .wTagName(nextTag('adopted-reuse-a'))
      .wShadowDOM('open')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="shared-adopted">A</div>'
      })
      .build()

    const ComponentB = new ComponentBwilder()
      .wTagName(nextTag('adopted-reuse-b'))
      .wShadowDOM('open')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="shared-adopted">B</div>'
      })
      .build()

    const a = new ComponentA()
    const b = new ComponentB()
    a.connectedCallback()
    b.connectedCallback()

    const aSheets = (a.shadowRoot! as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets
    const bSheets = (b.shadowRoot! as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets

    assert.equal(aSheets.length, 1)
    assert.equal(bSheets.length, 1)
    assert.equal(aSheets[0], bSheets[0])
  })

  test('adopted mode does not duplicate stylesheet across re-renders', () => {
    const css = '.adopted-no-dup { color: brown; }'

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('adopted-no-dup'))
      .wShadowDOM('open')
      .wObservedAttr('data-v')
      .wCSS(css)
      .wRender(function () {
        this.root.innerHTML = '<div class="adopted-no-dup">Text</div>'
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()
    c.setAttribute('data-v', '1')
    c.setAttribute('data-v', '2')
    c.render()

    const sheets = (c.shadowRoot! as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets
    assert.equal(sheets.length, 1)
    assert.equal(c.shadowRoot!.querySelectorAll('style').length, 0)
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
        .build()

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
      .build()

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
      .build()

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
      .build()

    assert.throws(() => {
      new ComponentBwilder()
        .wTagName(tag)
        .wRender(stubRender)
        .build()
    }, /already.*used|already.*defined|already.*registered/i)
  })

  test('registers class in customElements registry when tagName is provided', () => {
    const tag = nextTag('registry-tag')

    const MyComponentClass = new ComponentBwilder()
      .wTagName(tag)
      .wRender(stubRender)
      .build()

    assert.equal(customElements.get(tag), MyComponentClass)
  })

  test('invalid custom element tag name throws at build', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wTagName('invalidtag' as unknown as TagName)
        .wRender(stubRender)
        .build()
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
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(c.querySelector('#title')!.textContent, 'T')
    assert.equal(c.querySelector('#content')!.textContent, 'C')
  })

  test('subElements are resolved from selector map returned by render', () => {
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
      .wPostRenderFn(function ({subElements}) {
        postRenderTitle = subElements!.title?.textContent ?? ''
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(postRenderTitle, 'My Title')
    assert.equal(c.subElements.title?.textContent, 'My Title')
    assert.equal(c.subElements.content?.textContent, 'My Content')
  })

  test('subElements accept direct element map returned by render', () => {
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
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(c.subElements.title?.textContent, 'Direct Element')
  })

  test('subElements are provided to methods following their declaration', () => {
    let postMountContent = ''

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('subelements-post-mount'))
      .wElement('content')
      .wShadowDOM('none')
      .wRender(function () {
        this.root.innerHTML = '<div id="content">Mounted Content</div>'
        return {
          content: '#content'
        }
      })
      .wPostMountFn(function ({subElements}) {
        assert.equal(subElements.content?.textContent, 'Mounted Content')
        assert.equal(this.subElements.content?.textContent, 'Mounted Content')
      })
      .build()
  })

  test('build works without tagName and returns a class', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName(null)
      .wShadowDOM('none')
      .wRender(stubRender)
      .build()

    assert.equal(typeof MyComponentClass, 'function')
    // Without a tagName, the component is not registered, so it can be subclassed
    // but cannot be directly instantiated in a DOM environment
  })

  test('slotAddedHandler gets called for assigned elements', () => {
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
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()

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
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()
    assert.deepEqual(events, [])

    c.render()
    assert.deepEqual(events, [])
  })

  test('slotAddedHandler tracks assigned elements across slot changes', () => {
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
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()
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

  test('slotAddedHandler cleanups run on disconnect', () => {
    const events: string[] = []

    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('slot-disconnect'))
      .wRender(function ({root}) {
        root.innerHTML = '<slot data-slot="x"></slot>'
      })
      .wSlotAddedHandler(function () {
        events.push('add')
        return () => events.push('cleanup')
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()
    const slot = c.shadowRoot!.querySelector('slot') as HTMLSlotElement
    const assigned = document.createElement('div')
    ;(slot as any).assignedElements = () => [assigned]
    slot.dispatchEvent(new (slot.ownerDocument.defaultView as any).Event('slotchange'))

    assert.deepEqual(events, ['add'])

    c.disconnectedCallback()
    assert.deepEqual(events, ['add', 'cleanup'])
  })

  test('render function is bound to this context', () => {
    let foundThis = undefined
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('render-this-context'))
      .wShadowDOM('none')
      .wRender(function () {
        foundThis = this
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(foundThis, c)
  })

  test('rerender function is bound to this context in wPostMountFn functions', () => {
    let foundThis = undefined
    const MyComponentClass = new ComponentBwilder()
      .wTagName(nextTag('render-this-context'))
      .wShadowDOM('none')
      .wRender(function () {
        foundThis = this
      })
      .wPostMountFn(function () {
        foundThis = null
        this.rerender()
      })
      .build()

    const c = new MyComponentClass()
    c.connectedCallback()

    assert.equal(foundThis, c)
  })

})
