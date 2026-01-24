import {ComponentBwilder} from './componentBwilder.ts'
import {describe, test} from 'node:test'
import {strict as assert} from 'node:assert'
import {type RenderContext} from './render.ts'


// Typescript tests: prevent duplicate calls

// @ts-expect-error
new ComponentBwilder().wTagName('another-component').wTagName('another-component')

// @ts-expect-error
new ComponentBwilder().wCSS('.my-class { color: blue; }').wCSS('.my-class { color: blue; }')

// @ts-expect-error
new ComponentBwilder().wShadowDOM('open').wShadowDOM('open')


const stubRender = function (this: RenderContext) {
  this.root.innerHTML = '<div>Stub</div>'
  return {}
}

describe('ComponentBwilder basic tests', () => {
  test('successfully', () => {

    const MyBuilder =
      new ComponentBwilder()
        .wTagName('another-component')
        .wCSS('.my-class { color: blue; }')
        .wShadowDOM('open')
        .wRender(stubRender)
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
})


describe('ComponentBwilder render', () => {
  test('with render function', () => {
    const MyComponentClass = new ComponentBwilder()
      .wTagName('rendered-component-with-render-fn')
      .wShadowDOM('none')
      .wRender(function (this: RenderContext) {
        this.root.innerHTML = '<div class="content">Hello, world!</div>'
        return {}
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

  test('render function receives observed attribute value', () => {
    let observedValue: string | null = null;

    const MyComponentClass = new ComponentBwilder()
      .wTagName('rendered-component-with-attr')
      .wShadowDOM('none')
      .wObservedAttr('data-name')
      .wRender(function () {
        observedValue = this['data-name']
        this.root.innerHTML = `<div>Hello, ${observedValue}</div>`;
        return {};
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
})


const b = new ComponentBwilder()
let a2 = b.wObservedAttr('data-id')
let a3 = a2.wObservedAttr('role')
let a4 = a3.wObservedAttr('role2')
  .wObservedAttr('role3')
  .wObservedAttr('role4')

