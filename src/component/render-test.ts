import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test'
import {
  makeComponentRendererFromString,
  makeComponentRendererFromFn
} from './render.ts';
import type {
  ComponentRenderer,
  RenderContext
} from './render.ts';


describe('makeComponentRendererFromString', () => {

  it('should return a function that sets root innerHTML to the provided string', () => {
    const renderer =
      makeComponentRendererFromString('Hello, world!');
    const context = {root: document.createElement('div')};

    renderer.call(context);

    assert.equal(context.root.innerHTML, 'Hello, world!');
    assert.equal(context.root.outerHTML, '<div>Hello, world!</div>');
  });

  it('should return a function that maps subElements', async () => {
    const renderer =
      makeComponentRendererFromString('<div id="test">Hello, world!</div>', {test: '#test'});
    const context = {root: document.createElement('div')};

    const result = await renderer.call(context);

    assert.ok(result.hasOwnProperty('test'));
    assert.equal(result.test!.innerHTML, 'Hello, world!');
  });

  it('should map subElements to null when selector not found', () => {
    const renderer =
      makeComponentRendererFromString('<div></div>', {missing: '#nope'});

    const context = {root: document.createElement('div')};
    const result = renderer.call(context) as any;

    assert.ok(result.hasOwnProperty('missing'));
    assert.equal(result.missing, null);
  });

});

describe('makeComponentRendererFromFn', () => {

  it('should return a function that sets root innerHTML to the result of the provided function', () => {
    const renderer =
      makeComponentRendererFromFn(() => 'Hello, world!');
    const context = {root: document.createElement('div')};

    renderer.call(context);

    assert.equal(context.root.innerHTML, 'Hello, world!');
    assert.equal(context.root.outerHTML, '<div>Hello, world!</div>');
  });

  it('should allow html function to use context properties', () => {
    const renderer =
      makeComponentRendererFromFn(({name}: RenderContext<{ name: string }>) => {
        return `<div id="greet">Hello, ${name}</div>`;
      });
    const context = {root: document.createElement('div'), name: 'Mars'};

    renderer.call(context);

    assert.equal(context.root.querySelector('#greet')!.innerHTML, 'Hello, Mars');
  });
});
