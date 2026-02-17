# @ndp-software/component-bwilder

Typed, minimal helpers for building compact Web Components used in this repository.

This package exposes a small, TypeScript-first API for defining custom elements with an explicit render lifecycle, simple sub-element wiring, and optional adopted/inline CSS handling.

## Why this exists

- Focus: small APIs and tight TypeScript ergonomics for library/internal components.
- Predictability: explicit `render`, `postRender` and `postMount` lifecycle hooks.
- Convenience: fluent builder (`ComponentBwilder`) to declare attributes, sub-elements and rendering logic.

## Quick example

```ts
import { ComponentBwilder } from './componentBwilder'

new ComponentBwilder()
	.wTagName('x-greeting')
	.wShadowDOM('open')
	.wCSS(':host{display:block;padding:4px;}')
	.wObservedAttr('name')
	.wElement('label')
	.wRender(function() {
		this.root.innerHTML = `<div><span>${this.name ?? 'world'}</span></div>`
		return { label: 'span' }
	})
	.build()
```

See the implementation for full types and helpers.

## Main exports

- `ComponentBwilder` — fluent builder for declaring a component class and registering a tag.
- `makeComponentRendererFromFn`, `makeComponentRendererFromString` — small renderer helpers.
- `assertValidTagName`, `isValidTagName` — validate custom element names.
- Types: `ComponentRenderer`, `RenderContext`, `SubElementsMap`, and related types to strongly type render functions.

## Files of interest

- Implementation: [src/component/componentBwilder.ts](src/component/componentBwilder.ts)
- Public exports: [src/component/index.ts](src/component/index.ts)
- Tests and examples: [src/component/*-test.ts](src/component)

## Build & test

From `src/component` package directory:

```bash
npm run build                  # build JS + types
npm run test                   # run tests (node --test + jsdom)
npm run typecheck              # run TypeScript checks
```

## Alternatives / inspiration

- Hybrids: https://hybrids.js.org/ — similar philosophy for small components
- Lit: https://lit.dev/ 