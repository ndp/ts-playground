import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test'
import {
  makeComponentRendererFromString,
  buildDOM,
} from './render.ts';


describe('makeComponentRendererFromString', () => {
  it('should return a function that sets root innerHTML to the provided string', () => {
    const renderer = makeComponentRendererFromString('Hello, world!');
    const context = {root: document.createElement('div')};
    renderer.call(context);
    assert.equal(context.root.innerHTML, 'Hello, world!');
  });

  it('should return a function that sets root innerHTML to the result of the provided function', () => {
    const renderer = makeComponentRendererFromString(() => 'Hello, world!');
    const context = {root: document.createElement('div')};
    renderer.call(context);
    assert.equal(context.root.innerHTML, 'Hello, world!');
  });

  it('should return a function that maps subElements', () => {
    const renderer =
      makeComponentRendererFromString('<div id="test">Hello, world!</div>', {test: '#test'});

    const context = {root: document.createElement('div')};
    const result = renderer.call(context);

    assert.ok(result.hasOwnProperty('test'));
    assert.equal(result.test!.innerHTML, 'Hello, world!');
  });
});


describe('buildDOM', () => {
  it('should call the provided renderer on root element', (t) => {
    let calledCount = 0
    let savedThis = null;
    const renderer = function () {
        savedThis = this;
        calledCount++
    };
    const root = document.createElement('div')
    const context = {root};

    buildDOM(context, renderer);

    assert.equal(1, calledCount);
    assert.equal(root, savedThis.root);
  });

  it('should return the elements return from the provided renderer', () => {
    const renderer = function (this: { root: HTMLElement }) {
      this.root.innerHTML = '<div>Hello, <span>world</span>!</div>';
      return {span: this.root.querySelector('span')};
    };

    const context = {root: document.createElement('div')};
    const result = buildDOM(context, renderer) as ReturnType<typeof renderer>;

    assert.ok(result.hasOwnProperty('span'));
    assert.equal(result.span!.innerHTML, 'world');
    assert.equal(result.span!.tagName, 'SPAN');
  });

  it('should render using properties', () => {
    const renderer = function (this: { root: HTMLElement, name: string }) {
      this.root.innerHTML = `<div>Hello, <span>${this.name || 'world'}</span>!</div>`;
      return {span: this.root.querySelector('span')};
    };

    type foo =ReturnType<typeof renderer>

    const context = {root: document.createElement('div'), name: 'Earth'};
    // const result = buildDOM.call(context, renderer) as ReturnType<typeof renderer>;
    const result = buildDOM(context, renderer)

    assert.ok(result.hasOwnProperty('span'));
    assert.equal(result.span!.innerHTML, 'Earth');
    assert.equal(result.span!.tagName, 'SPAN');
  });
});

