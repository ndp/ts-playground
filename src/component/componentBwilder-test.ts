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

// @ts-expect-error
new ComponentBwilder().wPostMountFn(() => {}).wPostMountFn(() => {})

// @ts-expect-error
new ComponentBwilder().wPostRenderFn(() => {}).wPostRenderFn(() => {})


const stubRender = function (this: RenderContext) {
  this.root.innerHTML = '<div>Stub</div>'
}

describe('ComponentBwilder basic tests', () => {
  test('successfully', () => {

    const MyBuilder =
      new ComponentBwilder()
        .wTagName('another-component')
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
        .wTagName('simple-component')
        .wRender(stubRender)
    const MyComponent = MyBuilder.build()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) throw new Error('Component is not an instance of HTMLElement')

  })

  test('with closed shadowDOM', () => {
    const MyBuilder = new ComponentBwilder()
      .wTagName('closed-component')
      .wShadowDOM('closed')
      .wRender(stubRender)
    const MyComponent = MyBuilder.build()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) throw new Error('Component is not an instance of HTMLElement')
  })

  test('with no shadowDOM', () => {
    const MyBuilder =
      new ComponentBwilder()
        .wTagName('no-shadow-component')
        .wShadowDOM('none')
        .wRender(stubRender)
    const MyComponent = MyBuilder.build()

    const c = new MyComponent()
    if (!(c instanceof HTMLElement)) throw new Error('Component is not an instance of HTMLElement')

  })
})


describe('ComponentBwilder observed attributes', () => {
  test('basic definition', () => {
    const MyBuilder =
      new ComponentBwilder()
        .wTagName('observed-attrs-component')
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
      .wTagName('observed-attrs-callback-component')
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
      .wTagName('rendered-component-with-render-fn')
      .wShadowDOM('none')
      .wRender(function (this: RenderContext) {
        this.root.innerHTML = '<div class="content">Hello, world!</div>'
      })
      .build()

    const c = new MyComponentClass()
    // @ts-ignore
    c.connectedCallback()
    const contentDiv = c.querySelector('.content')
    assert.ok(contentDiv, 'Content div should exist')
    assert.equal(contentDiv!.innerHTML, 'Hello, world!', 'Content div should have correct content')
  })

  test('without render function', () => {
    assert.throws(() => {
      new ComponentBwilder()
        .wTagName('rendered-component-without-render-fn')
        .wShadowDOM('none')
        .build()
    }, /No render function provided to component/)
  })

  test('render function receives unobserved attribute value', () => {
    let unobservedValue: string | null = null;

    const MyComponentClass = new ComponentBwilder()
      .wTagName('rendered-component-with-unobs-attr')
      .wShadowDOM('none')
      .wAttr('data-info')
      .wRender(function () {
        unobservedValue = this['data-info']
        this.root.innerHTML = `<div>Info: ${unobservedValue}</div>`;
      })
      .build();

    const c = new MyComponentClass();
    c.setAttribute('data-info', 'some info');

    // @ts-ignore
    c.connectedCallback()

    const contentDiv = c.querySelector('div')
    assert.equal(contentDiv!.innerHTML, 'Info: some info', 'Content div should have correct content')

    c.setAttribute('data-info', 'other info');

    const contentDiv2 = c.querySelector('div')
    assert.equal(contentDiv2!.innerHTML, 'Info: some info', 'Content div should not change automatically')

    // Re-render manually since attribute is unobserved
    // @ts-ignore
    c.render();
    const contentDiv3 = c.querySelector('div')
    assert.equal(contentDiv3!.innerHTML, 'Info: other info', 'Content div should have updated content')
  })


  test('unobserved attribute value is null if not set', () => {

    let unobservedValue: string | null = 'initial';

    const MyComponentClass = new ComponentBwilder()
      .wTagName('rendered-component-with-unobs-attr-null')
      .wShadowDOM('none')
      .wAttr('data-info')
      .wRender(function () {
        unobservedValue = this['data-info']
        this.root.innerHTML = `<div>Info: ${unobservedValue}</div>`;
      })
      .build();

    const c = new MyComponentClass();
    // Note: not setting data-info attribute

    // @ts-ignore
    c.connectedCallback()

    const contentDiv = c.querySelector('div')
    assert.equal(contentDiv!.innerHTML, 'Info: null', 'Content div should show null for unset attribute')
  })

  test('unobserved attribute can have default value', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName('rendered-component-with-unobs-attr-default')
      .wShadowDOM('none')
      .wAttr('data-info', 'a default value')
      .wRender(function () {
        this.root.innerHTML = `<div>Info: ${this['data-info']}</div>`;
      })
      .build();
    const c = new MyComponentClass();
    // Note: not setting data-info attribute

    // @ts-ignore
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
    // @ts-ignore
    c.connectedCallback()
    assert.equal(c.querySelector('div')!.innerHTML, 'Info: fallback-default')

    c.setAttribute('data-info', '')
    // @ts-ignore
    c.render()
    assert.equal(c.querySelector('div')!.innerHTML, 'Info: ')

    c.removeAttribute('data-info')
    // @ts-ignore
    c.render()
    assert.equal(c.querySelector('div')!.innerHTML, 'Info: fallback-default')
  })

  test('render function receives observed attribute value', () => {
    let observedValue: string | null = null;

    const MyComponentClass = new ComponentBwilder()
      .wTagName('rendered-component-with-attr')
      .wShadowDOM('none')
      .wObservedAttr('data-name')
      .wRender(function () {
        observedValue = this['data-name']
        this.root.innerHTML = `<div>Hello, ${observedValue}</div>`;
      })
      .build();

    const c = new MyComponentClass();
    c.setAttribute('data-name', 'world!');

    // @ts-ignore
    c.connectedCallback()

    const contentDiv = c.querySelector('div')
    assert.equal(contentDiv!.innerHTML, 'Hello, world!', 'Content div should have correct content')

    c.setAttribute('data-name', 'Frank');
    const contentDiv2 = c.querySelector('div')
    assert.equal(contentDiv2!.innerHTML, 'Hello, Frank', 'Content div should have updated content')
  })

  test('includes CSS in shadow DOM', () => {
    const css = `.test-class { color: red; }`;
    const MyComponentClass = new ComponentBwilder()
      .wTagName('styled-component')
      .wShadowDOM('open')
      .wCSS(css)
      .wRender(function (this: RenderContext) {
        this.root.innerHTML = '<div class="test-class">Styled Text</div>';
      })
      .build();

    const c = new MyComponentClass();
    // @ts-ignore
    c.connectedCallback();

    const shadowRoot = c.shadowRoot;
    assert.ok(shadowRoot, 'Shadow root should exist');

    const styleElement = shadowRoot!.querySelector('style');
    assert.ok(styleElement, 'Style element should exist in shadow DOM');
    assert.equal(styleElement!.textContent, css, 'Style element should contain the correct CSS');
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
    // @ts-ignore
    c.connectedCallback()

    assert.equal(renderCount, 1)
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
    // @ts-ignore
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
    // @ts-ignore
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
    // @ts-ignore
    c.connectedCallback()

    assert.equal(c.querySelector('div')!.innerHTML, 'DestructureStyle')
  })

  test('wPostMountFn runs once after initial render', () => {
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
    // @ts-ignore
    c.connectedCallback()

    assert.equal(mountCount, 1)
    assert.deepEqual(events, ['render', 'postMount'])

    c.setAttribute('data-v', 'next')

    assert.equal(mountCount, 1)
    assert.deepEqual(events, ['render', 'postMount', 'render'])
  })

  test('wPostMountFn receives context as first argument', () => {
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
    // @ts-ignore
    c.connectedCallback()

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
    // @ts-ignore
    c.connectedCallback()
    assert.equal(renderCount, 1)
    assert.equal(postRenderCount, 1)

    c.setAttribute('data-v', 'next')
    assert.equal(renderCount, 2)
    assert.equal(postRenderCount, 2)

    // @ts-ignore
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
        lastText = root.querySelector('div')!.textContent ?? ''
      })
      .build()

    const c = new MyComponentClass()
    // @ts-ignore
    c.connectedCallback()
    assert.equal(lastText, 'init')

    c.setAttribute('data-v', 'next')
    assert.equal(lastText, 'next')
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
    // @ts-ignore
    c.connectedCallback()
    c.setAttribute('data-v', 'a')
    // @ts-ignore
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
    // @ts-ignore
    c.connectedCallback()
    c.setAttribute('data-v', 'a')
    // @ts-ignore
    c.render()

    assert.equal(c.shadowRoot!.querySelectorAll('style').length, 1)
    assert.equal(c.shadowRoot!.querySelector('style')!.textContent, css)
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
    // @ts-ignore
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
    // @ts-ignore
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
    // @ts-ignore
    c.connectedCallback()

    assert.equal(c.querySelector('#title')!.textContent, 'T')
    assert.equal(c.querySelector('#content')!.textContent, 'C')
  })

  test('build works without tagName and returns a class', () => {
    const MyComponentClass = new ComponentBwilder()
      .wShadowDOM('none')
      .wRender(stubRender)
      .build()

    assert.equal(typeof MyComponentClass, 'function')

    assert.throws(() => {
      new MyComponentClass()
    }, /Invalid constructor|not part of the custom element registry/)
  })
})


const b = new ComponentBwilder()
let a2 = b.wObservedAttr('data-id')
let a3 = a2.wObservedAttr('role')
let a4 = a3.wObservedAttr('role2')
  .wObservedAttr('role3')
  .wObservedAttr('role4')

