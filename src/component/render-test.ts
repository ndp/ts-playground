import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test'
import {
  makeComponentRendererFromString,
  makeComponentRendererFromFn
} from './render.ts';
import type {
  ComponentRenderer,
  RenderContext,
  ElementDescriptor
} from './render.ts';


describe('makeComponentRendererFromString', () => {

  it('should return a function that sets root innerHTML to the provided string', () => {
    const renderer =
      makeComponentRendererFromString('Hello, world!');
    const context = makeAContext();

    renderer.call(context, context);

    assert.equal(context.root.innerHTML, 'Hello, world!');
    assert.equal(context.root.outerHTML, '<div>Hello, world!</div>');
  });

  it('should return a function that maps subElements', async () => {
    const renderer =
      makeComponentRendererFromString('<div id="test">Hello, world!</div>', {test: '#test'});
    const context = makeAContext();

    const result = await renderer.call(context, context);

    assert.ok(result.hasOwnProperty('test'));
    assert.equal(result.test!.innerHTML, 'Hello, world!');
  });

  it('should map subElements to null when selector not found', () => {
    const renderer =
      makeComponentRendererFromString('<div></div>', {missing: '#nope'});

    const context = makeAContext();
    const result = renderer.call(context, context) as any;

    assert.ok(result.hasOwnProperty('missing'));
    assert.equal(result.missing, null);
  });

});

describe('makeComponentRendererFromFn', () => {

  it('should return a function that sets root innerHTML to the result of the provided function', () => {
    const renderer =
      makeComponentRendererFromFn(() => 'Hello, world!');
    const context = makeAContext();

    renderer.call(context, context);

    assert.equal(context.root.innerHTML, 'Hello, world!');
    assert.equal(context.root.outerHTML, '<div>Hello, world!</div>');
  });

  it('should allow html function to use context properties', () => {
    const renderer =
      makeComponentRendererFromFn((context) => {
        return `<div id="greet">Hello, ${(context as any).name}</div>`;
      });
    const ctx = {root: document.createElement('div'), name: 'Mars', subElements: {}, state: {}};

    renderer.call(ctx, ctx);

    assert.equal(ctx.root.querySelector('#greet')!.innerHTML, 'Hello, Mars');
  });

  it('should preserve HTMLElement type for string selectors', () => {
    const renderer =
      makeComponentRendererFromString('<div id="test">content</div>', {test: '#test'});
    const context = makeAContext();

    const result = renderer.call(context, context) as any;

    // Type should be HTMLElement | null - can be anything
    assert.ok(result.test);
  });

  it('should preserve specific element types via ElementDescriptor', () => {
    const renderer =
      makeComponentRendererFromString('<input id="input" type="text" />', {
        input: {selector: '#input'}
      });
    const context = makeAContext();

    const result = renderer.call(context, context) as any;

    // Result is an HTMLInputElement since we specified the selector correctly
    assert.ok(result.input);
    assert.ok(result.input.getAttribute('type') === 'text');
  });

  it('should handle mixed string and ElementDescriptor selectors', () => {
    const renderer =
      makeComponentRendererFromString(
        '<button id="btn">Click</button><input id="inp" />',
        {
          button: '#btn',
          input: {selector: '#inp'}
        }
      );
    const context = makeAContext();

    const result = renderer.call(context, context) as any;

    assert.ok(result.button instanceof HTMLElement);
    assert.ok(result.input);
  });
});


function makeAContext(inRoot?: HTMLElement) {
  return {
    root: inRoot ?? document.createElement('div'),
    subElements: {},
    state: {}
  }
}